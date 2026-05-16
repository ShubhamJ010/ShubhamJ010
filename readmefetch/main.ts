import { Octokit } from "@octokit/rest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateReadme } from "./src/gen_readme";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main(): Promise<number> {
  try {
    const token = process.env.GH_STATS_TOKEN;
    if (!token) {
      throw new Error("GH_STATS_TOKEN environment variable not set");
    }

    const scriptDir = __dirname;
    process.chdir(scriptDir);

    const octokit = new Octokit({ auth: token });
    const readmePath = join(scriptDir, "..", "README.md");
    const outDir = join(scriptDir, "..", "out");

    await generateReadme(octokit, readmePath, outDir);
    console.log(" README updated successfully!");
    return 0;
  } catch (e) {
    console.error(` ${e}`, e instanceof Error ? e.stack : "");
    return 1;
  }
}

process.exit(await main());
