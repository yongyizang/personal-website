import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const bio = defineCollection({
  loader: glob({
    base: 'src/content/bio',
    pattern: '**/*.mdx',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    lang: z.enum(['en', 'zh']),
    variant: z.enum(['short', 'long']),
  }),
});

const blog = defineCollection({
  loader: glob({
    base: 'src/content/blog',
    pattern: '**/*.mdx',
    generateId: ({ entry }) => {
      // Include locale dir in ID: "en/hello-world" instead of "hello-world"
      return entry.replace(/\.mdx$/, '');
    },
  }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    cover: z.object({
      src: image(),
      alt: z.string(),
    }).optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    authors: z.array(z.object({
      name: z.string(),
      affiliation: z.string().optional(),
      url: z.string().optional(),
    })).default([]),
    tags: z.array(z.string()).default([]),
    bibliography: z.array(z.object({
      key: z.string(),
      title: z.string(),
      authors: z.string(),
      venue: z.string().optional(),
      year: z.number().optional(),
      url: z.string().optional(),
      doi: z.string().optional(),
      // What exactly the post takes from this source; shown under the entry in the reference list.
      note: z.string().optional(),
    })).default([]),
    draft: z.boolean().default(false),
    lang: z.enum(['en', 'zh']),
    slug: z.string(),
    translationOf: z.string().optional(),
    toc: z.boolean().default(true),
    // Adds a "Citation" section (plain text + BibTeX) to the end of the post.
    citation: z.boolean().default(false),
  }),
});

export const collections = { bio, blog };
