import { Octokit } from "@octokit/rest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Config {
  display_stats: string[];
  additional_info: string;
  preferred_color: string;
  max_languages: number;
  append_automatic: boolean;
  exclude_orgainzations: boolean;
}

interface UserStats {
  username: string;
  followers: number;
  following: number;
  public_repos: number;
  private_repos: number;
  public_gists: number;
  total_stars: number;
  starred_repos: number;
  bytes_of_code: number;
  bio: string | null;
  location: string | null;
  company: string | null;
  email: string | null;
  website: string | null;
  hireable: boolean | null;
  created_at: string;
  updated_at: string;
  languages: string;
  total_commits: number;
  total_issues: number;
  total_prs: number;
}

function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

const config = loadConfig();

async function getRepos(octokit: Octokit) {
  const excludeOrganizations = config.exclude_orgainzations;
  const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    type: "public",
    per_page: 100,
  });
  const publicRepos = repos.filter((r) => r.visibility === "public");
  if (excludeOrganizations) {
    return publicRepos.filter((r) => r.owner.type !== "Organization");
  }
  return publicRepos;
}

async function getLinesOfCode(octokit: Octokit): Promise<number> {
  let totalLines = 0;
  const repos = await getRepos(octokit);
  for (const repo of repos) {
    if (repo.visibility === "public") {
      try {
        const { data: languages } = await octokit.rest.repos.listLanguages({
          owner: repo.owner.login,
          repo: repo.name,
        });
        totalLines += Object.values(languages as Record<string, number>).reduce((sum, v) => sum + v, 0);
      } catch {
        continue;
      }
    }
  }
  return totalLines;
}

async function getLanguages(octokit: Octokit): Promise<Record<string, number>> {
  const languages: Record<string, number> = {};
  const repos = await getRepos(octokit);
  for (const repo of repos) {
    if (!repo.fork && repo.visibility === "public") {
      try {
        const { data: langs } = await octokit.rest.repos.listLanguages({
          owner: repo.owner.login,
          repo: repo.name,
        });
        for (const [lang, bytes] of Object.entries(langs as Record<string, number>)) {
          languages[lang] = (languages[lang] || 0) + bytes;
        }
      } catch {
        continue;
      }
    }
  }
  return languages;
}

function formatLanguages(languages: Record<string, number>): string {
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const maxLanguages = config.max_languages;
  const selected = maxLanguages !== -1 ? sorted.slice(0, maxLanguages) : sorted;
  return "\n" + selected.map(([lang, bytes]) => `- ${lang}: ${bytes} bytes of code`).join("\n");
}

async function fetchStats(octokit: Octokit): Promise<UserStats> {
  const { data: user } = await octokit.rest.users.getAuthenticated();

  const repos = await getRepos(octokit);
  const nonForkRepos = repos.filter((r) => !r.fork && r.visibility === "public");

  let totalCommits = 0;
  let totalIssues = 0;
  let totalPRs = 0;

  for (const repo of nonForkRepos) {
    try {
      const commitResponse = await octokit.rest.repos.listCommits({
        owner: repo.owner.login,
        repo: repo.name,
        per_page: 1,
      });
      const linkHeader = commitResponse.headers.link as string | undefined;
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) totalCommits += parseInt(match[1], 10);
      } else {
        totalCommits += commitResponse.data.length;
      }
    } catch {
      continue;
    }

    try {
      const issueResponse = await octokit.rest.issues.listForRepo({
        owner: repo.owner.login,
        repo: repo.name,
        state: "open",
        per_page: 1,
      });
      const totalCount = issueResponse.headers["x-total-count"];
      if (totalCount !== undefined) {
        totalIssues += Number(totalCount);
      }
    } catch {
      continue;
    }

    try {
      const prResponse = await octokit.rest.pulls.list({
        owner: repo.owner.login,
        repo: repo.name,
        state: "open",
        per_page: 1,
      });
      const totalCount = prResponse.headers["x-total-count"];
      if (totalCount !== undefined) {
        totalPRs += Number(totalCount);
      }
    } catch {
      continue;
    }
  }

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  let starredCount = 0;
  try {
    starredCount = (await octokit.paginate(octokit.rest.activity.listReposStarredByAuthenticatedUser, {
      per_page: 100,
    })).length;
  } catch {
    starredCount = 0;
  }

  const createdAt = new Date(user.created_at).toLocaleDateString("en-GB").replace(/\//g, "-");
  const updatedAt = new Date(user.updated_at).toLocaleDateString("en-GB").replace(/\//g, "-");

  return {
    username: user.login,
    followers: user.followers,
    following: user.following,
    public_repos: user.public_repos,
    private_repos: user.total_private_repos ?? 0,
    public_gists: user.public_gists,
    total_stars: totalStars,
    starred_repos: starredCount,
    bytes_of_code: await getLinesOfCode(octokit),
    bio: user.bio ?? null,
    location: user.location ?? null,
    company: user.company ?? null,
    email: user.email ?? null,
    website: user.blog ?? null,
    hireable: user.hireable ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
    languages: formatLanguages(await getLanguages(octokit)),
    total_commits: totalCommits,
    total_issues: totalIssues,
    total_prs: totalPRs,
  };
}

export { fetchStats };
export type { UserStats };
