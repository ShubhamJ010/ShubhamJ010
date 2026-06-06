import type { Octokit } from "@octokit/rest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadColors } from "../config";
import { fetchStats } from "../fetch_info";
import { buildStats } from "../stats-builder";
import { escapeXml } from "../utils/xml";
import { digitRollAnimate } from "./digit-roll";
import type { StatItem } from "../types/config";

const FONT_FAMILY = "'JetBrains Mono', 'Fira Code', 'Consolas', monospace";
const FONT_SIZE = 14;

/**
 * Layout constants for the stats card grid.
 */
const COLS = 4;
const ROWS = 3;
const CARD_WIDTH = 180;
const CARD_HEIGHT = 90;
const GAP_X = 28;
const GAP_Y = 28;
const START_X = 50;
const START_Y = 50;

function buildSvgHeader(width: number, height: number, bgColor: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @font-face {
        font-family: 'JetBrains Mono';
        src: url('fonts/JetBrainsMono-Bold.ttf') format('truetype');
        font-weight: bold;
        font-style: normal;
      }
      .stat-card rect {
        transition: stroke-width 0.3s ease, filter 0.3s ease;
      }
      .stat-card:hover rect {
        stroke-width: 2.5;
        filter: drop-shadow(0 0 8px currentColor);
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g>`;
}

function buildSvgFooter(): string {
  return `  </g>
</svg>`;
}

function renderNumberCard(
  stat: StatItem,
  x: number,
  y: number,
  paletteColor: string,
  bgColor: string,
  valueColor: string,
  index: number,
): string {
  const cx = x + CARD_WIDTH / 2;
  const labelY = y + 28;
  const valY = y + 62;
  const rollDuration = 4.0;
  const rollDelay = index * 0.12;

  return `
        <g class="stat-card" id="stat-${index}">
          <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="10" fill="${bgColor}" stroke="${paletteColor}" stroke-width="1.5"/>
          <text x="${cx}" y="${labelY}" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="${valueColor}" text-anchor="middle">${escapeXml(stat.label)}</text>
          ${digitRollAnimate(Number(stat.value), rollDelay, rollDuration, cx, valY, index)}
        </g>`;
}

function renderStringCard(
  stat: StatItem,
  x: number,
  y: number,
  paletteColor: string,
  bgColor: string,
  textColor: string,
  valueColor: string,
): string {
  const cx = x + CARD_WIDTH / 2;
  const labelY = y + 28;
  const valY = y + 62;

  return `
        <g class="stat-card">
          <rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="10" fill="${bgColor}" stroke="${paletteColor}" stroke-width="1.5"/>
          <text x="${cx}" y="${labelY}" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="${valueColor}" text-anchor="middle">${escapeXml(stat.label)}</text>
          <text x="${cx}" y="${valY}" font-family="${FONT_FAMILY}" font-size="22" font-weight="bold" fill="${textColor}" text-anchor="middle">${escapeXml(String(stat.value))}</text>
        </g>`;
}

function renderStatCards(stats: StatItem[], bgColor: string, textColor: string, valueColor: string, palette: string[]): string {
  return stats.map((stat, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = START_X + col * (CARD_WIDTH + GAP_X);
    const y = START_Y + row * (CARD_HEIGHT + GAP_Y);
    const paletteColor = palette[i % palette.length];
    const isNumber = typeof stat.value === "number";

    if (isNumber) {
      return renderNumberCard(stat, x, y, paletteColor, bgColor, valueColor, i);
    }
    return renderStringCard(stat, x, y, paletteColor, bgColor, textColor, valueColor);
  }).join("\n");
}

/**
 * Generates the SVG image containing GitHub stats cards.
 */
export async function genImage(octokit: Octokit, outDir = "out"): Promise<void> {
  const colors = loadColors();
  const bgColor = colors.background;
  const textColor = colors.foreground;
  const valueColor = colors.value;
  const palette = colors.palette;

  const user = await fetchStats(octokit);
  const stats = buildStats(user);

  const width = START_X * 2 + COLS * CARD_WIDTH + (COLS - 1) * GAP_X;
  const height = START_Y * 2 + ROWS * CARD_HEIGHT + (ROWS - 1) * GAP_Y + 40;

  const header = buildSvgHeader(width, height, bgColor);
  const cards = renderStatCards(stats, bgColor, textColor, valueColor, palette);
  const footer = buildSvgFooter();

  const svg = `${header}
    ${cards}
  ${footer}`;

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "fetch.svg"), svg);
}