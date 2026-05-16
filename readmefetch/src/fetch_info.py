import os
import json
from dotenv import load_dotenv
from github import Github
from collections import Counter

def load_config():
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(script_dir, "config.json")
    with open(config_path, "r") as f:
        return json.load(f)

config = load_config()

def get_repos(g: Github):
    exclude_organizations = config.get("exclude_orgainzations", True)
    repos = [repo for repo in g.get_user().get_repos(type="public") if repo.visibility == "public"]
    if exclude_organizations:
        repos = [repo for repo in repos if repo.owner.type != "Organization"]
    return repos

def get_lines_of_code(g: Github) -> int:
    total_lines = 0
    for repo in get_repos(g):
        if repo.visibility == "public":
            try:
                languages = repo.get_languages()
                total_lines += sum(languages.values())
            except Exception:
                continue
    return total_lines

def get_languages(g: Github) -> dict:
    languages = Counter()
    for repo in get_repos(g):
        if not repo.fork and repo.visibility == "public":
            try:
                for lang, bytes_count in repo.get_languages().items():
                    languages[lang] += bytes_count
            except Exception:
                continue
    return dict(languages)

def format_languages(languages: dict) -> str:
    sorted_lang = sorted(languages.items(), key=lambda x: x[1], reverse=True)
    max_languages = config.get("max_languages", -1)
    if max_languages != -1:
        sorted_lang = sorted_lang[:max_languages]
    return '\n' + '\n'.join([f"- {lang}: {bytes_count} bytes of code" for lang, bytes_count in sorted_lang])

def fetch_stats(g: Github) -> dict:
    user = g.get_user()
    total_commits = 0
    total_issues = 0
    total_prs = 0

    for repo in get_repos(g):
        if not repo.fork and repo.visibility == "public":
            try:
                total_commits += repo.get_commits().totalCount
                total_issues += repo.get_issues().totalCount
                total_prs += repo.get_pulls().totalCount
            except Exception:
                continue

    return {
        "username": user.login,
        "followers": user.followers,
        "following": user.following,
        "public_repos": user.public_repos,
        "private_repos": user.total_private_repos or 0,
        "public_gists": user.public_gists,
        "total_stars": sum([repo.stargazers_count for repo in get_repos(g)]),
        "starred_repos": g.get_user().get_starred().totalCount,
        "bytes_of_code": get_lines_of_code(g),
        "bio": user.bio,
        "location": user.location,
        "company": user.company,
        "email": user.email,
        "website": user.blog,
        "hireable": user.hireable,
        "created_at": user.created_at.strftime("%d-%m-%Y"),
        "updated_at": user.updated_at.strftime("%d-%m-%Y"),
        "languages": format_languages(get_languages(g)),
        "total_commits": total_commits,
        "total_issues": total_issues,
        "total_prs": total_prs,
    }
