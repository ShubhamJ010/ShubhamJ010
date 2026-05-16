import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Octokit } from "@octokit/rest";
import { imageToAscii } from "./draw_ascii";
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

function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

const COLOR_MAP: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  purple: [128, 0, 128],
  orange: [255, 165, 0],
  pink: [255, 192, 203],
  white: [255, 255, 255],
  lightblue: [173, 216, 230],
};

function returnPreferredColor(): [number, number, number] {
  const config = loadConfig();
  return COLOR_MAP[config.preferred_color] ?? COLOR_MAP.lightblue;
}

async function generateFetch(octokit: Octokit): Promise<string> {
  const config = loadConfig();
  const user = await fetchStats(octokit);
  const { data: authUser } = await octokit.rest.users.getAuthenticated();
  const pfp = await imageToAscii(authUser.avatar_url);

  let stats = `${user.username}@github.com\n------------------------------\n`;
  for (const stat of config.display_stats) {
    if (stat in user) {
      const value = (user as unknown as Record<string, unknown>)[stat];
      stats += `${stat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${value}\n`;
    }
  }
  stats += `\n${config.additional_info}\n`;

  const pfpLines = pfp.split("\n");
  const statsLines = stats.split("\n");

  const maxLines = Math.max(pfpLines.length, statsLines.length);
  while (pfpLines.length < maxLines) pfpLines.push("");
  while (statsLines.length < maxLines) statsLines.push("");

  const combined = pfpLines
    .map((pfpLine, i) => `${pfpLine.padEnd(50)} ${statsLines[i]}`)
    .join("\n");

  return combined;
}

async function genImage(octokit: Octokit, outDir = "out") {
  const width = 1200;
  const initialHeight = 550;
  const asciiWidth = 450;
  const textMargin = 60;

  const bgColor = [12, 17, 22] as const;
  const valueColor = returnPreferredColor();
  const textColor: [number, number, number] = [255, 255, 255];
  const fontSize = 16;

  const fontPaths = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/usr/share/fonts/truetype/ubuntu/UbuntuMono-R.ttf",
    "/usr/share/fonts/liberation-mono/LiberationMono-Regular.ttf",
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Andale Mono.ttf",
    "/Library/Fonts/Andale Mono.ttf",
  ];

  let fontRegistered = false;
  for (const fp of fontPaths) {
    try {
      GlobalFonts.registerFromPath(fp, "Mono");
      fontRegistered = true;
      break;
    } catch {
      continue;
    }
  }

  const fetch = await generateFetch(octokit);

  function render(canvasWidth: number, canvasHeight: number): Buffer {
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = `rgb(${bgColor[0]}, ${bgColor[1]}, ${bgColor[2]})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const fontFace = fontRegistered ? "16px Mono" : "16px monospace";
    ctx.font = fontFace;

    const lines = fetch.split("\n");
    const asciiLines = lines.map((l) => l.slice(0, 50));
    const infoLines = lines.map((l) => l.slice(50).trim());

    const lineSpacing = fontSize + 4;

    let yOffset = 10;
    for (const asciiLine of asciiLines) {
      ctx.fillStyle = `rgb(${valueColor[0]}, ${valueColor[1]}, ${valueColor[2]})`;
      ctx.fillText(asciiLine, 10, yOffset);
      yOffset += lineSpacing;
    }

    yOffset = 10;
    const xText = asciiWidth + textMargin;
    const maxTextWidth = canvasWidth - asciiWidth - textMargin * 2;

    for (const infoLine of infoLines) {
      if (!infoLine) {
        yOffset += lineSpacing;
        continue;
      }

      const parts = infoLine.split(":");
      if (parts.length >= 2) {
        const title = parts[0] + ":";
        const value = parts.slice(1).join(":").trim();

        const titleWidth = ctx.measureText(title).width;
        ctx.fillStyle = `rgb(${valueColor[0]}, ${valueColor[1]}, ${valueColor[2]})`;
        ctx.fillText(title, xText, yOffset);

        const xValue = xText + titleWidth + 5;
        const remainingWidth = maxTextWidth - titleWidth - 5;
        ctx.fillStyle = `rgb(${textColor[0]}, ${textColor[1]}, ${textColor[2]})`;

        const words = value.split(/\s+/);
        let line: string[] = [];
        let xCurrent = xValue;

        for (const word of words) {
          const testLine = [...line, word].join(" ");
          const textWidth = ctx.measureText(testLine).width;

          if (textWidth <= remainingWidth) {
            line.push(word);
          } else {
            if (line.length > 0) {
              ctx.fillText(line.join(" "), xCurrent, yOffset);
              yOffset += lineSpacing;
              line = [word];
              xCurrent = xText + textMargin;
            } else {
              ctx.fillText(word, xCurrent, yOffset);
              yOffset += lineSpacing;
            }
          }
        }
        if (line.length > 0) {
          ctx.fillText(line.join(" "), xCurrent, yOffset);
        }
        yOffset += lineSpacing;
      } else {
        ctx.fillStyle = `rgb(${textColor[0]}, ${textColor[1]}, ${textColor[2]})`;
        const words = infoLine.split(/\s+/);
        let line: string[] = [];
        let xCurrent = xText;

        for (const word of words) {
          const testLine = [...line, word].join(" ");
          const textWidth = ctx.measureText(testLine).width;

          if (textWidth <= maxTextWidth) {
            line.push(word);
          } else {
            if (line.length > 0) {
              ctx.fillText(line.join(" "), xCurrent, yOffset);
              yOffset += lineSpacing;
              line = [word];
              xCurrent = xText;
            } else {
              ctx.fillText(word, xCurrent, yOffset);
              yOffset += lineSpacing;
              xCurrent = xText;
            }
          }
        }
        if (line.length > 0) {
          ctx.fillText(line.join(" "), xCurrent, yOffset);
        }
        yOffset += lineSpacing;
      }
    }

    if (yOffset > canvasHeight) {
      return render(canvasWidth, yOffset + 20);
    }

    return canvas.toBuffer("image/png");
  }

  const pngBuffer = render(width, initialHeight);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "fetch.png"), pngBuffer);
}

async function generateReadme(octokit: Octokit, readmePath = "../README.md", outDir = "../out") {
  await genImage(octokit, outDir);

  let content = readFileSync(readmePath, "utf-8");

  const statsBlock =
    "<!--START_GITHUB_STATS-->\n\n" +
    '<p align="center">\n' +
    '  <img src="out/fetch.png" alt="Github Fetch" width="700">\n' +
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
