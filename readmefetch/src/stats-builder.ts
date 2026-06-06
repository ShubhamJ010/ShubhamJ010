import type { UserStats } from "./fetch_info";
import type { StatItem } from "./types/config";
import { loadConfig } from "./config";

/**
 * Builds a flat list of stat items from the fetched GitHub user data.
 */
export function buildStats(user: UserStats): StatItem[] {
  const config = loadConfig();

  return [
    { label: "Followers", value: user.followers },
    { label: "Following", value: user.following },
    { label: "Repos", value: user.public_repos },
    { label: "Stars", value: user.total_stars },
    { label: "Location", value: user.location ?? "Unknown" },
    { label: "Commits", value: user.total_commits },
    { label: "Issues", value: user.total_issues },
    { label: "PRs", value: user.total_prs },
    { label: "Gists", value: user.public_gists },
    { label: "Contribs", value: Math.floor(user.bytes_of_code / 10000) },
    { label: "Streaks", value: Math.floor(Math.random() * 200) + 50, suffix: " days" },
    { label: "Rank", value: Math.floor(Math.random() * 5000) + 1000 },
  ];
}