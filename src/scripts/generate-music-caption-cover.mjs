/**
 * A wordless, procedural cover: sound unfolds into individually addressable grains.
 * Run: node src/scripts/generate-music-caption-cover.mjs
 * Original SVG geometry only; no fonts, remote assets, or image generation.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const output = fileURLToPath(new URL('../content/blog/assets/', import.meta.url));
const name = 'fine-grained-captions-for-music-generation-cover';
const C = { paper: '#f8f6f0', ink: '#262622', accent: '#e77450' };
const round = (n) => Number(n.toFixed(2));
const path = (d, color, width = 3.5) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const block = (x, y, w, h, color) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(2, h / 2)}" fill="${color}"/>`;

// A shared signal opens into five voices using zero-derivative easing.
const voices = [];
for (let row = 0; row < 5; row++) {
  const offset = (row - 2) * 77;
  const color = row === 2 ? C.accent : C.ink;
  let d = '';
  for (let i = 0; i <= 210; i++) {
    const t = i / 210;
    const x = 333 + t * 585;
    const spread = Math.max(0, Math.min(1, (t - 0.42) / 0.58));
    const eased = spread * spread * (3 - 2 * spread);
    const envelope = Math.sin(Math.PI * t) ** 1.25;
    const oscillation = Math.sin(t * Math.PI * 5.1 + row * 0.61);
    const y = 450 + offset * (0.13 + 0.87 * eased)
      + oscillation * envelope * (93 - 30 * eased);
    d += `${i ? 'L' : 'M'}${round(x)} ${round(y)} `;
  }
  voices.push({ d, color, y: 450 + offset, row });
}

let drawing = '';
// Paper-colored under-strokes keep crossing strands individually readable.
for (const { d, color } of voices) {
  drawing += path(d, C.paper, 10);
  drawing += path(d, color, 4);
}

// A sparse visual alphabet: duration is a dash, an event is a dot.
// Shared alignment conveys time without grids or interface elements.
const patterns = [
  [48, 7, 28, 7, 42],
  [7, 36, 7, 48, 20],
  [33, 7, 49, 7, 29],
  [48, 7, 24, 7, 42],
  [7, 7, 48, 7, 30],
];
for (const { color, y, row } of voices) {
  drawing += path(`M918 ${y} H946`, color, 4);
  for (let i = 0; i < 5; i++) {
    const x = 977 + i * 60;
    const width = patterns[row][i];
    drawing += width === 7
      ? circle(x + 3.5, y, 3.5, color)
      : block(x, y - 3.5, width, 7, color);
  }
}

// One singled-out grain represents a detail one can describe and edit.
drawing += '<rect x="1088" y="425" width="67" height="50" rx="3" fill="none" stroke="' + C.accent + '" stroke-width="1.5"/>';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="cover-title cover-description">
  <title id="cover-title">细粒度的声音</title>
  <desc id="cover-description">米白背景上，五条交织的声波逐渐展开为独立的点与短线。其中一条为陶土橙色，一个声音片段被细框选中，象征音乐细节可以被单独描述与编辑。画面没有可见文字。</desc>
  <rect width="1600" height="900" fill="${C.paper}"/>
  ${drawing}
</svg>`;

await mkdir(output, { recursive: true });
await writeFile(`${output}${name}.svg`, svg);
await sharp(Buffer.from(svg)).resize(3200, 1800).png().toFile(`${output}${name}.png`);
await sharp(Buffer.from(svg)).resize(1600, 900).webp({ quality: 90 }).toFile(`${output}${name}.webp`);
console.log(`Generated wordless SVG, PNG (3200×1800), and WebP in ${output}`);
