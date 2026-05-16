import os
import requests
import re
from datetime import datetime

def get_github_stats(username, token=None):
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    if token:
        headers['Authorization'] = f'token {token}'
    
    # Get user info
    user_url = f'https://api.github.com/users/{username}'
    user_resp = requests.get(user_url, headers=headers).json()
    
    public_repos = user_resp.get('public_repos', 0)
    private_repos = user_resp.get('total_private_repos', 0)
    
    # Get stars received
    stars_received = 0
    page = 1
    while True:
        repos_url = f'https://api.github.com/users/{username}/repos?per_page=100&page={page}'
        repos_resp = requests.get(repos_url, headers=headers).json()
        if not repos_resp:
            break
        for repo in repos_resp:
            stars_received += repo.get('stargazers_count', 0)
        if len(repos_resp) < 100:
            break
        page += 1

    # Get total starred by user (stars given)
    starred_url = f'https://api.github.com/users/{username}/starred?per_page=1'
    starred_resp = requests.get(starred_url, headers=headers)
    total_starred_by_user = 0
    if 'link' in starred_resp.headers:
        links = starred_resp.headers['link'].split(',')
        for link in links:
            if 'rel="last"' in link:
                total_starred_by_user = int(re.search(r'page=(\d+)', link).group(1))
                break
    else:
        total_starred_by_user = len(starred_resp.json())

    # Get last pushed repo and its last commit
    sorted_repos_url = f'https://api.github.com/users/{username}/repos?sort=pushed&direction=desc&per_page=1'
    last_repo_resp = requests.get(sorted_repos_url, headers=headers).json()
    last_repo_name = last_repo_resp[0]['name'] if last_repo_resp else "N/A"
    last_repo_url = last_repo_resp[0]['html_url'] if last_repo_resp else "#"
    
    last_commit_message = "N/A"
    if last_repo_resp:
        commits_url = f"https://api.github.com/repos/{username}/{last_repo_name}/commits?per_page=1"
        commits_resp = requests.get(commits_url, headers=headers).json()
        if commits_resp and isinstance(commits_resp, list):
            last_commit_message = commits_resp[0]['commit']['message'].split('\n')[0]

    return {
        "public_repos": public_repos,
        "private_repos": private_repos,
        "stars_received": stars_received,
        "total_starred_by_user": total_starred_by_user,
        "last_repo_name": last_repo_name,
        "last_repo_url": last_repo_url,
        "last_commit_message": last_commit_message
    }

def update_readme(stats):
    readme_path = "README.md"
    if not os.path.exists(readme_path):
        return

    with open(readme_path, "r") as f:
        content = f.read()

    # Markdown table-style output
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    terminal_output = f"""
| **shubhamj010 @ github** | |
| :--- | :--- |
| 📂 **Repos** | {stats['public_repos']} (pub) / {stats['private_repos']} (priv) |
| ⭐ **Stars** | {stats['stars_received']} received |
| 🌟 **Starred** | {stats['total_starred_by_user']} repositories |
| 🚀 **Last Commit** | [{stats['last_commit_message']}]({stats['last_repo_url']}) |
| 📅 **Updated** | {now} |
"""

    new_block = f"<!--START_GITHUB_STATS-->\n{terminal_output}\n<!--END_GITHUB_STATS-->"

    if "<!--START_GITHUB_STATS-->" in content:
        content = re.sub(
            r"<!--START_GITHUB_STATS-->.*?<!--END_GITHUB_STATS-->",
            new_block,
            content,
            flags=re.DOTALL,
        )
    else:
        if "## MySocials" in content:
            content = content.replace("## MySocials", f"## GithubStats\n\n{new_block}\n\n## MySocials")
        else:
            content += f"\n\n## GithubStats\n\n{new_block}\n"

    with open(readme_path, "w") as f:
        f.write(content)

if __name__ == "__main__":
    username = "shubhamj010"
    token = os.environ.get("GITHUB_TOKEN")
    try:
        stats = get_github_stats(username, token)
        update_readme(stats)
        print("README updated with GitHub stats")
    except Exception as e:
        print(f"Error updating GitHub stats: {e}")
