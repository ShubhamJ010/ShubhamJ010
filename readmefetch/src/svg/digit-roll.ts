/**
 * Smooth rolling digit animation using opacity cross-fade.
 *
 * Each digit position shows digits 0→1→2→…→target with a smooth
 * spline-eased fade-in/fade-out. No clip-paths needed, so no cropping.
 *
 * Non-numeric characters (commas, spaces, suffixes) are rendered statically.
 *
 * Returns an object with:
 *   - clips:  empty string (no clip-paths)
 *   - body:   string of all animated <text> elements
 */

const FONT_SIZE = 28;
const CHAR_W = 22;
const FONT_FAMILY = "'JetBrains Mono', 'Fira Code', 'Consolas', monospace";

export interface DigitRollResult {
  clips: string;
  body: string;
}

export function digitRollAnimate(
  targetValue: number,
  delay: number,
  duration: number,
  cx: number,
  cy: number,
  uid: number,
): DigitRollResult {
  const digits = targetValue.toLocaleString().split("");
  const numW = digits.length * CHAR_W;
  const startX = cx - numW / 2;

  const bodyParts: string[] = [];

  digits.forEach((ch, idx) => {
    const d = parseInt(ch, 10);
    const xPos = startX + idx * CHAR_W;

    if (isNaN(d)) {
      bodyParts.push(
        `<text x="${xPos}" y="${cy}" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="#f0b7ca">${ch}</text>`,
      );
      return;
    }

    const steps = d + 1;

    // Each digit gets an equal time slice, with fade-in/fade-out overlaps
    for (let si = 0; si < steps; si++) {
      const isLast = si === steps - 1;

      // Fade in at si/steps, hold briefly, fade out before next
      const tFadeIn = si / steps;
      const tPeak = (si + 0.25) / steps;
      const tFadeOut = (si + 0.5) / steps;
      const tEnd = (si + 1) / steps;

      const keyTimes = isLast
        ? `0; ${tFadeIn.toFixed(4)}; ${tPeak.toFixed(4)}; 1`
        : `0; ${tFadeIn.toFixed(4)}; ${tPeak.toFixed(4)}; ${tFadeOut.toFixed(4)}; ${tEnd.toFixed(4)}; 1`;

      const values = isLast
        ? "0; 0; 1; 1"
        : "0; 0; 1; 1; 0; 0";

      const keySplines = isLast
        ? "0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1"
        : "0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1";

      bodyParts.push(
        `<text x="${xPos}" y="${cy}" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="#f0b7ca">
            <animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" keySplines="${keySplines}" calcMode="spline" begin="${delay}s" dur="${duration}s" fill="freeze"/>
            ${si}
          </text>`,
      );
    }
  });

  return {
    clips: "",
    body: bodyParts.join("\n        "),
  };
}