import { createCanvas, loadImage } from "@napi-rs/canvas";

const ASCII_CHARS = '.:-=+*#%@"';

function getAsciiChar(pixel: [number, number, number]): string {
  const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
  const charIndex = Math.min(
    Math.floor((brightness / 255) * (ASCII_CHARS.length - 1)),
    ASCII_CHARS.length - 1,
  );
  return ASCII_CHARS[charIndex];
}

async function imageToAscii(url: string, width = 50): Promise<string> {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const img = await loadImage(buffer);
  const aspectRatio = img.width / img.height;
  const height = Math.floor(width * aspectRatio * 0.5);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  let asciiStr = "";
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const pixel: [number, number, number] = [pixels[idx], pixels[idx + 1], pixels[idx + 2]];
      asciiStr += getAsciiChar(pixel);
    }
    asciiStr += "\n";
  }

  return asciiStr;
}

export { imageToAscii };
