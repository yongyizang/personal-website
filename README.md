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

It also holds `googleAnalyticsId` (a GA4 "G-…" ID; remove the line to turn
analytics off). The script is added to production builds only.

Link previews on X, LinkedIn and WeChat are built from these values too. A post
with a `cover` is shared with that cover as a large card (cropped to
1200 × 630; WeChat shows only the middle square). Every other page is shared
with the profile image as a small square card.

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
language toggle will morph between them. A post written in only one language
is fine too: on that page the toggle leads to the other language's home page.

Optional frontmatter:

| Field          | What it does                                                        |
| -------------- | ------------------------------------------------------------------- |
| `authors`      | List of `{ name, affiliation?, url? }` shown under the title         |
| `updated`      | Date of the last revision                                            |
| `bibliography` | Sources that can be cited from the text (see below)                  |
| `citation`     | `true` adds a "Citation" section (plain text + BibTeX) for the post  |
| `toc`          | `false` hides the table of contents                                  |
| `draft`        | `true` keeps the post out of the build; it still shows in `npm run dev` |

## Writing posts

Everything below is plain Markdown — no imports, no components. The draft post
`src/content/blog/en/writing-guide.mdx` (and its `zh` twin) shows all of it
rendered; open it at `/en/blog/writing-guide/` while running `npm run dev`.

**Margin notes.** Write an ordinary footnote. On wide screens the note stands
in the margin beside its marker; on small ones the marker opens it in place.

```md
A claim that needs a caveat.[^1]

[^1]: The caveat.
```

**Citations.** List sources once in the frontmatter, cite them by key. Each
work gets a number in order of first appearance, its details appear in the
margin the first time it is cited, and a "References" list is appended to the
post.

```md
---
bibliography:
  - key: hu2021lora
    title: "LoRA: Low-Rank Adaptation of Large Language Models"
    authors: "Hu, Shen, Wallis, et al."
    venue: "ICLR"
    year: 2022
    url: https://arxiv.org/abs/2106.09685
---

Low-rank adaptation [@hu2021lora] … several at once [@hu2021lora; @other2020].
```

An entry can also carry a `note:` saying what exactly the post takes from that
source (a figure, a quotation); it is printed under the entry in the reference
list. To introduce the list in your own words, end the post with a
`## References` (or `## 参考文献`) heading and a paragraph — the list is then
appended to those.

**Tables.** Standard pipe tables. A paragraph directly below one that starts
with `Table 1:` (or `表 1：`) becomes its caption. Wide tables scroll sideways
on small screens.

```md
| Method | Accuracy |
| :----- | -------: |
| Ours   |     91.2 |

Table 1: What the table shows.
```

**Figures.** An image on its own line becomes a captioned figure when it has a
title, or when the paragraph below it starts with `Figure 1:` (or `图 1：`).

```md
![Alt text](./plot.png "Figure 1: What the plot shows.")
```

**Code.** Fenced blocks get syntax colours for both themes, a language label
and a copy button.

**Math.** Formulas are LaTeX, rendered with KaTeX at build time: `$inline$`
and `$$display$$`. Environments work as usual inside `$$…$$` — `align` and
`equation` number themselves, `\tag{…}` sets a label by hand, and matrices,
`cases` and the like are all available. Formulas can also be used in notes and
tables, and copying one from the page gives its LaTeX source. Write a literal
dollar sign as `\$`. Your own macros can be passed to the plugin in
`astro.config.mjs`: `[rehypeKatex, { macros: { '\\R': '\\mathbb{R}' } }]`.

```md
$$
\begin{align}
h &= W_0 x + \Delta W x \\
  &= W_0 x + \frac{\alpha}{r} B A x
\end{align}
$$
```

**Foldable blocks.** A derivation, a proof or a long aside can be folded away
behind its title with HTML's own `<details>`; it opens with a click (and stays
open across a language switch). Leave a blank line between the tags and the
text so the text is read as Markdown. Notes and citations inside one open in
place instead of in the margin. Keep headings out of it: they would be listed
in the table of contents while hidden.

```md
<details>
<summary>Derivation: why the optimum is unique</summary>

Text, math, tables, code…

</details>
```

**Citation block.** `citation: true` in the frontmatter adds a section at the
end telling readers how to cite the post, in plain text and BibTeX.

A few components are still available for cases Markdown can't express:
`<Figure src="/…" caption="…" wide />` (an image wider than the text column),
and the older `<Cite id="…" />` / `<Bibliography entries={…} />` pair.

## Project structure

```
├── astro.config.mjs        # Astro + integrations (MDX, Preact, sitemap), Markdown plugins
├── public/                 # Static assets served as-is (favicons, profile photo, fonts)
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
│   ├── integrations/
│   │   └── subset-fonts.mjs   # Build step: trims the CJK font to the glyphs in use
│   ├── layouts/            # BaseLayout, BlogLayout
│   ├── lib/
│   │   └── site.ts         # Typed loaders for site.yaml / news.yaml
│   ├── pages/              # Route files — /en, /zh, /en/blog, etc.
│   ├── plugins/            # Markdown plugins: margin notes & citations, tables/figures/code/foldable blocks
│   ├── scripts/
│   │   └── generate-search-index.ts   # Build-time search index builder
│   └── styles/             # Global SCSS (variables, typography, themes, motion) + prose.scss for posts
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
that smoothly transforms every on-screen string into its counterpart. It keeps
what was open (the long bio, the news list) open, and keeps your place in a
long post. With "reduce motion" switched on in the OS, the switch is instant.

The handful of UI labels (e.g. "more" / "less") live in `src/i18n/*.json`.
Everything else that's personal content lives in `src/content/`.

## Motion

Durations and easing curves are defined once in `src/styles/_motion.scss` and
shared by everything that moves: the first-load entrance, the bio and news
unfolding, hover states, page transitions. The theme switch reveals the new
theme through a circle growing from the toggle (`ThemeToggle.astro`). All of
it is disabled under the OS "reduce motion" setting.

## Fonts

Latin text is set in Roboto, self-hosted from the `@fontsource-variable/roboto`
package. Chinese is set in OPPO Sans from `public/fonts/`. Those files are
about 5 MB per weight, so the build rewrites the copies in `dist/` to contain
only the characters the site uses (tens of kB); `npm run dev` serves the
originals. Text that isn't known at build time — what a visitor types into the
search box — may fall back to the system font for unusual characters.

## Deployment

`npm run build` produces a fully static `dist/` that you can drop on any static
host. The `astro.config.mjs` `site` field should match your deployed URL (used
for canonical links, the sitemap, and the URL in a post's citation block).

- **GitHub Pages**: push `dist/` to the `gh-pages` branch, or use a workflow.
- **Netlify / Vercel / Cloudflare Pages**: point the build command at
  `npm run build:full`, publish directory `dist/`.

## License

Content © Yongyi Zang. Code under the MIT license.
