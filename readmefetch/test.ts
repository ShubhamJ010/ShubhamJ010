import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { Octokit } from "@octokit/rest";
import { imageToAscii } from "./src/draw_ascii";
import { fetchStats } from "./src/fetch_info";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Colors {
  name: string;
  background: string;
  foreground: string;
  value: string;
  palette: string[];
}

function loadColors(): Colors {
  return JSON.parse(readFileSync(join(__dirname, "colors.json"), "utf-8"));
}

function hexToRgb(hex: string): [number, number, number] {
  const val = parseInt(hex.replace("#", ""), 16);
  return [(val >> 16) & 255, (val >> 8) & 255, val & 255];
}

function rgbStr(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

async function main() {
  const colors = loadColors();
  const bg = hexToRgb(colors.background);
  const fg = hexToRgb(colors.foreground);
  const vl = hexToRgb(colors.value);
  const palette = colors.palette.map(hexToRgb);

  const fontPath = join(__dirname, "fonts", "JetBrainsMono-Bold.ttf");
  let fontRegistered = false;
  try {
    GlobalFonts.registerFromPath(fontPath, "JetBrainsMono");
    fontRegistered = true;
    console.log(`  font registered: ${GlobalFonts.families.map((f) => f.family).join(", ")}`);
  } catch {
    console.warn("  custom font not found, using system default");
  }

  const token = process.env.GH_STATS_TOKEN;
  let display: string[] = [];
  if (token) {
    console.log("  fetching real stats...");
    const octokit = new Octokit({ auth: token });
    const user = await fetchStats(octokit);
    const { data: authUser } = await octokit.rest.users.getAuthenticated();
    const pfp = await imageToAscii(authUser.avatar_url);
    const stats = [
      `${user.username}@github.com`,
      "------------------------------",
      ...["username", "bio", "location", "followers", "following", "public_repos", "private_repos", "public_gists", "total_stars", "starred_repos", "bytes_of_code", "created_at", "updated_at", "languages", "total_commits", "total_issues", "total_prs"].map((s) => {
        const val = (user as any)[s];
        const label = s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        return `${label}: ${val ?? "N/A"}`;
      }),
      "",
      "Java  TypeScript  Anime  Night Code",
    ];
    const pfpLines = pfp.split("\n");
    const statsLines = stats;
    const maxLines = Math.max(pfpLines.length, statsLines.length);
    while (pfpLines.length < maxLines) pfpLines.push("");
    while (statsLines.length < maxLines) statsLines.push("");
    display = pfpLines.map((l, i) => `${l.padEnd(50)} ${statsLines[i]}`);
  } else {
    console.log("  GH_STATS_TOKEN not set, using sample data");
    const sample = [
      "ShubhamJ010@github.com",
      "------------------------------",
      "Username: ShubhamJ010",
      "Bio: Developer & Anime Enthusiast",
      "Location: India",
      "Followers: 42",
      "Following: 69",
      "Public Repos: 28",
      "Private Repos: 5",
      "Public Gists: 3",
      "Total Stars: 120",
      "Starred Repos: 50",
      "Bytes of Code: 2500000",
      "Created: 01-01-2020",
      "Updated: 15-05-2026",
      "Languages:",
      "  - TypeScript: 500000 bytes of code",
      "  - Java: 300000 bytes of code",
      "  - Python: 200000 bytes of code",
      "  - Rust: 100000 bytes of code",
      "  - Go: 50000 bytes of code",
      "Total Commits: 1500",
      "Total Issues: 30",
      "Total PRs: 45",
      "",
      "Java  TypeScript  Anime  Night Code",
    ];
    const pfpLines = [
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
      ".:-=+*#%@@\"",
    ];
    const maxLines = Math.max(pfpLines.length, sample.length);
    while (pfpLines.length < maxLines) pfpLines.push("");
    while (sample.length < maxLines) sample.push("");
    display = pfpLines.map((l, i) => `${l.padEnd(50)} ${sample[i]}`);
  }

  // --- RENDER ---
  const canvasW = 1200;
  const canvasH = 600;
  const canvas = createCanvas(canvasW, canvasH);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = rgbStr(bg);
  ctx.fillRect(0, 0, canvasW, canvasH);

  const fontSize = 16;
  const fontFace = fontRegistered ? `bold ${fontSize}px JetBrainsMono` : `bold ${fontSize}px monospace`;
  ctx.font = fontFace;
  const lineH = fontSize + 4;

  const lines = display;
  const asciiW = 450;
  const textMargin = 60;

  // ASCII art on the left — use palette colors cycling through
  let y = 10;
  for (const line of lines) {
    const asciiPart = line.slice(0, 50);
    for (let c = 0; c < asciiPart.length; c++) {
      const pIdx = c % palette.length;
      ctx.fillStyle = rgbStr(palette[pIdx]);
      ctx.fillText(asciiPart[c], 10 + c * 9.6, y);
    }
    y += lineH;
  }

  // Stats on the right
  y = 10;
  const xText = asciiW + textMargin;
  const maxTextW = canvasW - asciiW - textMargin * 2;

  for (const line of lines) {
    const info = line.slice(50).trim();
    if (!info) { y += lineH; continue; }

    const parts = info.split(":");
    if (parts.length >= 2) {
      const title = parts[0] + ":";
      const value = parts.slice(1).join(":").trim();
      const tw = ctx.measureText(title).width;

      ctx.fillStyle = rgbStr(vl);
      ctx.fillText(title, xText, y);

      ctx.fillStyle = rgbStr(fg);
      const valW = ctx.measureText(value).width;
      if (xText + tw + 5 + valW > canvasW - textMargin) {
        const words = value.split(/\s+/);
        let l: string[] = [];
        let cx = xText + tw + 5;
        for (const w of words) {
          const test = [...l, w].join(" ");
          if (ctx.measureText(test).width <= maxTextW - tw - 5) {
            l.push(w);
          } else {
            if (l.length) ctx.fillText(l.join(" "), cx, y);
            y += lineH;
            l = [w];
            cx = xText + textMargin;
          }
        }
        if (l.length) ctx.fillText(l.join(" "), cx, y);
      } else {
        ctx.fillText(value, xText + tw + 5, y);
      }
    } else {
      ctx.fillStyle = rgbStr(vl);
      ctx.fillText(info, xText, y);
    }
    y += lineH;
  }

  // Palette bar at bottom-right
  const blockSize = 24;
  const gap = 3;
  const px = canvasW - 8 * (blockSize + gap) - 10;
  let py = canvasH - 2 * (blockSize + gap) - 10;

  ctx.font = fontFace;
  ctx.fillStyle = rgbStr(vl);
  ctx.fillText("Palette:", px, py - 8);

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      const idx = row * 8 + col;
      ctx.fillStyle = rgbStr(palette[idx]);
      ctx.fillRect(px + col * (blockSize + gap), py + row * (blockSize + gap), blockSize, blockSize);
    }
  }

  // Color name label
  ctx.fillStyle = rgbStr(fg);
  ctx.fillText(colors.name, px, py + 2 * (blockSize + gap) + 14);

  // Save
  const outDir = join(__dirname, "..", "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "fetch.png");
  writeFileSync(outPath, canvas.toBuffer("image/png"));
  console.log(`  saved: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
