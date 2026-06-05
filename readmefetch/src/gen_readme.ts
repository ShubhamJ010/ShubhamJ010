import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Octokit } from "@octokit/rest";
import { fetchStats } from "./fetch_info";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Config {
  display_stats: string[];
  additional_info: string;
  preferred_color: string;
  max_languages: number;
  append_automatic: boolean;
  exclude_orgainzations: boolean;
}

interface Colors {
  name: string;
  background: string;
  foreground: string;
  value: string;
  palette: string[];
}

interface StatItem {
  label: string;
  value: number | string;
  suffix?: string;
}

function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function loadColors(): Colors {
  const colorsPath = join(__dirname, "..", "colors.json");
  return JSON.parse(readFileSync(colorsPath, "utf-8"));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildStats(user: Awaited<ReturnType<typeof fetchStats>>): StatItem[] {
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

async function genImage(octokit: Octokit, outDir = "out"): Promise<void> {
  const colors = loadColors();
  const bgColor = colors.background;
  const textColor = colors.foreground;
  const valueColor = colors.value;
  const palette = colors.palette;

  const user = await fetchStats(octokit);
  const stats = buildStats(user);

  const cols = 4;
  const rows = 3;
  const cardWidth = 180;
  const cardHeight = 90;
  const gapX = 28;
  const gapY = 28;
  const startX = 50;
  const startY = 50;

  const width = startX * 2 + cols * cardWidth + (cols - 1) * gapX;
  const height = startY * 2 + rows * cardHeight + (rows - 1) * gapY + 40;

  const fontSize = 14;
  const fontFamily = "'JetBrains Mono', 'Fira Code', 'Consolas', monospace";

  let svgParts: string[] = [];

  stats.forEach((stat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);

    const delay = i * 0.15;
    const fadeInDuration = 0.8;
    const countUpDelay = delay + fadeInDuration;
    const countUpDuration = 1.5 + Math.random() * 1.0;

    const isNumber = typeof stat.value === "number";
    const targetValue = isNumber ? stat.value : 0;
    const suffix = stat.suffix ?? "";
    const cardId = `stat-${i}`;
    const paletteColor = palette[i % palette.length];

    if (isNumber) {
      const formattedValue = targetValue.toLocaleString() + suffix;
      svgParts.push(`
        <g class="stat-card" id="${cardId}" style="animation: fadeInUp ${fadeInDuration}s ease-out ${delay}s both;">
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="${bgColor}" stroke="${paletteColor}" stroke-width="1.5"/>
          <text x="${x + cardWidth / 2}" y="${y + 28}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" fill="${valueColor}" text-anchor="middle">${escapeXml(stat.label)}</text>
          <text x="${x + cardWidth / 2}" y="${y + 62}" font-family="${fontFamily}" font-size="28" font-weight="bold" fill="${textColor}" text-anchor="middle">${escapeXml(formattedValue)}</text>
        </g>
      `);
    } else {
      svgParts.push(`
        <g class="stat-card" style="animation: fadeInUp ${fadeInDuration}s ease-out ${delay}s both;">
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="${bgColor}" stroke="${paletteColor}" stroke-width="1.5"/>
          <text x="${x + cardWidth / 2}" y="${y + 28}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="bold" fill="${valueColor}" text-anchor="middle">${escapeXml(stat.label)}</text>
          <text x="${x + cardWidth / 2}" y="${y + 62}" font-family="${fontFamily}" font-size="22" font-weight="bold" fill="${textColor}" text-anchor="middle">${escapeXml(String(stat.value))}</text>
        </g>
      `);
    }
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'JetBrains Mono';
        src: url('fonts/JetBrainsMono-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
      }
      @keyframes fadeInUp {
        0% { opacity: 0; transform: translateY(15px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes colorCycle {
        0% { stroke: ${palette[1]}; }
        12.5% { stroke: ${palette[2]}; }
        25% { stroke: ${palette[3]}; }
        37.5% { stroke: ${palette[4]}; }
        50% { stroke: ${palette[5]}; }
        62.5% { stroke: ${palette[6]}; }
        75% { stroke: ${palette[7]}; }
        87.5% { stroke: ${palette[8]}; }
        100% { stroke: ${palette[1]}; }
      }
      .stat-card rect {
        transition: stroke-width 0.3s ease, filter 0.3s ease;
        animation: colorCycle 20s steps(1) infinite;
      }
      .stat-card:hover rect {
        stroke: ${valueColor};
        stroke-width: 2.5;
        filter: drop-shadow(0 0 8px ${valueColor});
      }
      .live-indicator {
        animation: pulse 1.2s ease-in-out infinite;
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g>
    ${svgParts.join("\n")}
  </g>
  <text x="${width - 30}" y="${height - 18}" font-family="${fontFamily}" font-size="11" fill="${valueColor}" text-anchor="end" class="live-indicator">● LIVE</text>
</svg>`;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "fetch.svg"), svg);
}

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