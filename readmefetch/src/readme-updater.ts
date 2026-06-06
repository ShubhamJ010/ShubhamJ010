import type { Octokit } from "@octokit/rest";
import { readFileSync, writeFileSync } from "node:fs";
import { genImage } from "./svg/svg-generator";

/**
 * Inserts or updates the GitHub stats image block in the README file.
 */
async function generateReadme(octokit: Octokit, readmePath = "../README.md", outDir = "../out"): Promise<void> {
  await genImage(octokit, outDir);

  let content = readFileSync(readmePath, "utf-8");

  const statsBlock =
    "<!--START_GITHUB_STATS-->\n\n" +
    '<p align="center">\n' +
    '  <img src="out/fetch.svg" alt="Github Stats" width="100%">\n' +
    "</p>\n\n" +
    "<!--END_GITHUB_STATS-->";

  if (content.includes("<!--START_GITHUB_STATS-->")) {
    content = content.replace(
      /<!--START_GITHUB_STATS-->.*?<!--END_GITHUB_STATS-->/s,
      statsBlock,
    );
  } else {
    content += `\n\n## GithubStats\n\n${statsBlock}\n`;
  }

  writeFileSync(readmePath, content, "utf-8");
}

export { generateReadme };