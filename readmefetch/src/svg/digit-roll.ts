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

const PAUSE = 5; // seconds to wait after animation completes before repeating

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

  // Total time for one full cycle: animation + pause
  const totalDur = duration + PAUSE;
  const K = duration / totalDur; // fraction of total cycle taken by the actual animation

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
      // All times are scaled by K so the rolling animation fits within
      // the first `duration` seconds of the total cycle, leaving PAUSE seconds
      // of static display before the next repeat.
      const tFadeIn = (si / steps) * K;
      const tPeak = ((si + 0.25) / steps) * K;
      const tFadeOut = ((si + 0.5) / steps) * K;
      const tEnd = ((si + 1) / steps) * K;

      const keyTimes = isLast
        ? `0; ${tFadeIn.toFixed(4)}; ${tPeak.toFixed(4)}; ${K.toFixed(4)}; 1`
        : `0; ${tFadeIn.toFixed(4)}; ${tPeak.toFixed(4)}; ${tFadeOut.toFixed(4)}; ${tEnd.toFixed(4)}; ${K.toFixed(4)}; 1`;

      const values = isLast
        ? "0; 0; 1; 1; 1"
        : "0; 0; 1; 1; 0; 0; 0";

      const keySplines = isLast
        ? "0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1"
        : "0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1; 0.25 0.1 0.25 1";

      bodyParts.push(
        `<text x="${xPos}" y="${cy}" font-family="${FONT_FAMILY}" font-size="${FONT_SIZE}" font-weight="bold" fill="#f0b7ca">
            <animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" keySplines="${keySplines}" calcMode="spline" begin="${delay}s" dur="${totalDur.toFixed(4)}s" fill="freeze" repeatCount="indefinite"/>
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
