/**
 * Astro integration: shrink the CJK webfont to what the site actually uses.
 *
 * OPPO Sans covers tens of thousands of glyphs and weighs about 5 MB per
 * weight, yet the whole site needs a few hundred of them. After a build this
 * scans the output for every character that can end up on screen and rewrites
 * each font file in dist/ to hold just those glyphs. File names stay the same,
 * so nothing else has to know. The originals in public/ are untouched and are
 * what `astro dev` serves.
 *
 * With the files small enough to fetch early, the two weights every Chinese
 * page uses are also preloaded there.
 *
 * If anything fails, the full fonts are simply left in place.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Punctuation and symbols kept regardless, so characters that arrive as HTML
// entities — or are typed into the search box — still match the typeface.
const ALWAYS = [
  [0x00a0, 0x00ff], // Latin-1 punctuation
  [0x2000, 0x206f], // general punctuation: dashes, quotes, ellipsis
  [0x2190, 0x2193], // arrows
  [0x3000, 0x303f], // CJK symbols and punctuation
  [0xff00, 0xffef], // full-width forms
];

const TEXT_FILES = /\.(html|js|json|xml|css)$/;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

export default function subsetFonts({ dir = 'fonts/OPPOSans', preload = ['OPPOSans-Regular.woff2', 'OPPOSans-Bold.woff2'] } = {}) {
  return {
    name: 'subset-fonts',
    hooks: {
      'astro:build:done': async ({ dir: outDir, logger }) => {
        try {
          const { default: subsetFont } = await import('subset-font');
          const root = fileURLToPath(outDir);

          // Every character in the built site. Latin is set in Roboto, which
          // comes first in the font stack, so ASCII is left out of this one.
          const chars = new Set();
          const pages = [];
          for await (const file of walk(root)) {
            if (!TEXT_FILES.test(file)) continue;
            let text = await readFile(file, 'utf8');
            if (file.endsWith('.html')) pages.push(file);
            // Bundlers may write non-ASCII characters in scripts as \uXXXX.
            else text = text.replace(/\\u\{?([0-9a-fA-F]{4,6})\}?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
            for (const char of text) if (char.codePointAt(0) > 0x7e) chars.add(char);
          }
          for (const [from, to] of ALWAYS) {
            for (let code = from; code <= to; code++) chars.add(String.fromCodePoint(code));
          }
          const text = [...chars].join('');

          const fontDir = path.join(root, dir);
          const fonts = (await readdir(fontDir)).filter(name => name.endsWith('.woff2'));
          for (const name of fonts) {
            const file = path.join(fontDir, name);
            const original = await readFile(file);
            const subset = await subsetFont(original, text, { targetFormat: 'woff2' });
            await writeFile(file, subset);
            logger.info(`${name}: ${(original.length / 1024).toFixed(0)} kB → ${(subset.length / 1024).toFixed(0)} kB`);
          }

          // Chinese pages always need the regular and bold weights: fetch them
          // alongside the stylesheet rather than after it.
          const links = preload
            .filter(name => fonts.includes(name))
            .map(name => `<link rel="preload" as="font" type="font/woff2" href="/${dir}/${name}" crossorigin>`)
            .join('');
          let preloaded = 0;
          for (const page of pages) {
            const html = await readFile(page, 'utf8');
            if (!links || !/<html[^>]*\slang="zh/.test(html) || !html.includes('</head>')) continue;
            await writeFile(page, html.replace('</head>', `${links}</head>`));
            preloaded++;
          }
          logger.info(`${chars.size} characters kept; preload added to ${preloaded} page(s).`);
        } catch (error) {
          logger.warn(`Skipped, full fonts left in place: ${error instanceof Error ? error.message : error}`);
        }
      },
    },
  };
}
