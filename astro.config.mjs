// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeNotes from './src/plugins/rehype-notes.mjs';
import rehypeBlocks from './src/plugins/rehype-blocks.mjs';
import subsetFonts from './src/integrations/subset-fonts.mjs';

export default defineConfig({
  site: 'https://yongyi.dev',
  integrations: [preact(), mdx(), sitemap(), subsetFonts()],
  markdown: {
    // Everything a post needs is plain Markdown; see README → "Writing posts".
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex, rehypeNotes, rehypeBlocks],
    shikiConfig: {
      // Both palettes are emitted; styles/_prose.scss picks one per theme.
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
});
