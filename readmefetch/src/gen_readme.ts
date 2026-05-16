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

interface Colors {
  name: string;
  background: string;
  foreground: string;
  value: string;
  palette: string[];
}

function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function loadColors(): Colors {
  const colorsPath = join(__dirname, "..", "colors.json");
  return JSON.parse(readFileSync(colorsPath, "utf-8"));
}

function hexToRgb(hex: string): [number, number, number] {
  const val = parseInt(hex.replace("#", ""), 16);
  return [(val >> 16) & 255, (val >> 8) & 255, val & 255];
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

  const colors = loadColors();
  const bgColor = hexToRgb(colors.background);
  const textColor = hexToRgb(colors.foreground);
  const valueColor = hexToRgb(colors.value);
  const palette = colors.palette.map(hexToRgb);
  const fontSize = 16;

  const fontPath = join(__dirname, "..", "fonts", "ff-tisa-web-pro.ttf");
  let fontRegistered = false;
  try {
    GlobalFonts.registerFromPath(fontPath, "Mono");
    fontRegistered = true;
  } catch {
    console.warn("  custom font not found, using system default");
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
    const charWidth = ctx.measureText("A").width;
    for (const asciiLine of asciiLines) {
      for (let c = 0; c < asciiLine.length; c++) {
        const pIdx = c % palette.length;
        ctx.fillStyle = `rgb(${palette[pIdx][0]}, ${palette[pIdx][1]}, ${palette[pIdx][2]})`;
        ctx.fillText(asciiLine[c], 10 + c * charWidth, yOffset);
      }
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

    const blockSize = 20;
    const gap = 3;
    const px = canvasWidth - 8 * (blockSize + gap) - 10;
    ctx.fillStyle = `rgb(${valueColor[0]}, ${valueColor[1]}, ${valueColor[2]})`;
    ctx.fillText(`Palette [${colors.name}]:`, px, yOffset);
    yOffset += 6;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const idx = row * 8 + col;
        ctx.fillStyle = `rgb(${palette[idx][0]}, ${palette[idx][1]}, ${palette[idx][2]})`;
        ctx.fillRect(px + col * (blockSize + gap), yOffset + row * (blockSize + gap), blockSize, blockSize);
      }
    }
    yOffset += 2 * (blockSize + gap) + 20;

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
