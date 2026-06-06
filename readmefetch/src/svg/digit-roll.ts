/**
 * Count-up animation: each digit stays in place and cycles 0→1→2→…→target.
 * Uses stacked <tspan> elements with opacity cycling (GitHub-compatible SMIL).
 */
export function digitRollAnimate(
  targetValue: number,
  delay: number,
  duration: number,
  cx: number,
  cy: number,
  uid: number,
): string {
  const digits = targetValue.toLocaleString().split("");
  const charW = 20;
  const numW = digits.length * charW;
  const startX = cx - numW / 2;

  let parts: string[] = [];

  digits.forEach((ch, idx) => {
    const d = parseInt(ch, 10);
    const xPos = startX + idx * charW;

    if (isNaN(d)) {
      parts.push(
        `<text x="${xPos}" y="${cy}" font-family="'JetBrains Mono', 'Fira Code', 'Consolas', monospace" font-size="28" font-weight="bold" fill="#f0b7ca">${ch}</text>`,
      );
      return;
    }

    // Count from 0 up to d: (d+1) steps
    const steps = d + 1;
    const stepDur = duration / steps;
    const keyTimes = Array.from({ length: steps }, (_, k) =>
      (k / steps).toFixed(4),
    );

    parts.push(`
        ${Array.from({ length: steps }, (_, si) => {
          const vals = Array.from({ length: steps }, (_, ki) =>
            ki === si ? "1" : "0",
          ).join("; ");
          return `<text x="${xPos}" y="${cy}" font-family="'JetBrains Mono', 'Fira Code', 'Consolas', monospace" font-size="28" font-weight="bold" fill="#f0b7ca">
            <animate attributeName="opacity" values="${vals}" keyTimes="${keyTimes.join("; ")}" begin="${delay}s" dur="${duration}s" fill="freeze" calcMode="discrete"/>
            ${si}
          </text>`;
        }).join("\n        ")}`);
  });

  return parts.join("\n        ");
}