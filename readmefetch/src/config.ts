import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Config, Colors } from "./types/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads the user config from config.json.
 */
export function loadConfig(): Config {
  const configPath = join(__dirname, "..", "config.json");
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

/**
 * Loads the color palette from colors.json.
 */
export function loadColors(): Colors {
  const colorsPath = join(__dirname, "..", "colors.json");
  return JSON.parse(readFileSync(colorsPath, "utf-8"));
}