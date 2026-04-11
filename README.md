# Personal Website

A minimalist bilingual (English / 中文) academic website built with
[Astro](https://astro.build). Blog posts are written in MDX, site content lives
in editable YAML/Markdown files — no code changes needed for day-to-day updates.

## Quick start

```sh
npm install
npm run dev          # http://localhost:4321
```

Other commands:

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run dev`         | Start the dev server                           |
| `npm run build`       | Build the static site to `./dist/`             |
| `npm run build:search`| Regenerate the client-side search index        |
| `npm run build:full`  | Rebuild search index and then the site         |
| `npm run preview`     | Preview the production build locally           |

## Editing content

Everything that a normal update would touch lives under `src/content/`.
You should not need to edit any `.astro`, `.ts`, or `.scss` files to change
your name, bio, news, or blog posts.

```
src/content/
  site.yaml           # Name, description, profile image, social links
  news.yaml           # Activity ticker (newest on top)
  bio/
    en-short.mdx      # Short bio (English)
    en-long.mdx       # Long bio revealed on "more" (English)
    zh-short.mdx      # Short bio (中文)
    zh-long.mdx       # Long bio (中文)
  blog/
    en/<slug>.mdx     # English blog posts
    zh/<slug>.mdx     # Chinese blog posts
```

### `site.yaml` — site config

Controls your name, meta description, profile image, and the row of social
links under the bio. Each text field has an `en` / `zh` variant.

### `news.yaml` — activity ticker

A list of `{ date, en, zh }` entries. The newest (top) entry is shown inline on
the home page; clicking it reveals the rest. Order matters — put newest first.

### `bio/*.mdx` — bios

Four small MDX files: a short and long bio for each locale. They support full
Markdown — links, emphasis, etc. The long bio is revealed via the "more"
toggle.

### `blog/<lang>/*.mdx` — blog posts

Each post is an MDX file with frontmatter. Minimal frontmatter:

```mdx
---
title: "Hello World"
description: "A short summary used for meta tags and the post list."
date: 2026-03-28
tags: ["research"]
lang: "en"
slug: "hello-world"
translationOf: "hello-world"   # Optional: links to the other-locale version
---

Post body goes here. You can use [links](…), **bold**, lists, etc.
```

For a post to appear in both languages, create one MDX file per locale under
`blog/en/` and `blog/zh/` with matching `slug` and `translationOf` fields. The
language toggle will morph between them.

### Blog components

Inside a blog post's MDX you can drop in a few custom components:

- `<Figure src="/…" caption="…" />` — captioned image
- `<Cite key="smith2024" />` — numbered citation that resolves from the
  `bibliography` array in the frontmatter
- `<Bibliography />` — renders the reference list at the bottom of the post

## Project structure

```
├── astro.config.mjs        # Astro + integrations (MDX, Preact, sitemap)
├── public/                 # Static assets served as-is (favicons, fonts)
├── src/
│   ├── components/         # Reusable .astro / .tsx components
│   │   ├── blog/           # Blog-specific components (Card, Figure, Cite…)
│   │   ├── pages/          # Full-page templates (IndexPage)
│   │   ├── search/         # Preact search island (client-side)
│   │   ├── BaseHead.astro
│   │   ├── LanguageToggle.astro
│   │   └── ThemeToggle.astro
│   ├── content/            # All editable content (see above)
│   │   ├── site.yaml
│   │   ├── news.yaml
│   │   ├── bio/
│   │   └── blog/
│   ├── content.config.ts   # Astro content collection schemas (validation)
│   ├── i18n/               # UI string translations (labels only, not content)
│   ├── layouts/            # BaseLayout, BlogLayout
│   ├── lib/
│   │   └── site.ts         # Typed loaders for site.yaml / news.yaml
│   ├── pages/              # Route files — /en, /zh, /en/blog, etc.
│   ├── scripts/
│   │   └── generate-search-index.ts   # Build-time search index builder
│   └── styles/             # Global SCSS (variables, typography, dark mode…)
└── README.md
```

## Search

A lightweight client-side search is implemented with [Fuse.js](https://fusejs.io).
At build time, `src/scripts/generate-search-index.ts` walks the blog MDX files
and writes `public/search-index.json`. The Preact island in
`src/components/search/SearchIsland.tsx` fetches that index on page idle.

Run `npm run build:full` if you've added blog posts and want the search index
refreshed before building.

## Internationalization

Two locales are configured in `astro.config.mjs`: `en` (default) and `zh`. URLs
are prefixed (`/en/...`, `/zh/...`). The language toggle in the top-right uses
a custom character-level morph animation (see `src/layouts/BaseLayout.astro`)
that smoothly transforms every on-screen string into its counterpart.

The handful of UI labels (e.g. "more" / "less") live in `src/i18n/*.json`.
Everything else that's personal content lives in `src/content/`.

## Deployment

`npm run build` produces a fully static `dist/` that you can drop on any static
host. The `astro.config.mjs` `site` field should be updated to match your
deployed URL (used for canonical links and the sitemap).

- **GitHub Pages**: push `dist/` to the `gh-pages` branch, or use a workflow.
- **Netlify / Vercel / Cloudflare Pages**: point the build command at
  `npm run build:full`, publish directory `dist/`.

## License

Content © Yongyi Zang. Code under the MIT license.
