/**
 * Build-time: generates a lightweight search index JSON for Fuse.js.
 * Run via: npx tsx src/scripts/generate-search-index.ts
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml'; // used for MDX frontmatter parsing

interface SearchDoc {
  id: string;
  type: 'blog';
  title: { en?: string; zh?: string };
  summary: { en?: string; zh?: string };
  url: { en?: string; zh?: string };
  authors?: string;
}

function parseMdxFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  return YAML.parse(match[1]);
}

async function main() {
  const documents: SearchDoc[] = [];

  // Blog posts
  console.log('Indexing blog posts...');
  for (const lang of ['en', 'zh']) {
    const dir = join('src/content/blog', lang);
    let files: string[];
    try { files = readdirSync(dir).filter(f => f.endsWith('.mdx')); } catch { continue; }

    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf-8');
      const fm = parseMdxFrontmatter(content);
      if (fm.draft) continue;

      documents.push({
        id: `blog:${lang}:${fm.slug || file.replace('.mdx', '')}`,
        type: 'blog',
        title: { [lang]: fm.title },
        summary: { [lang]: fm.description || '' },
        url: { [lang]: `/${lang}/blog/${fm.slug || file.replace('.mdx', '')}` },
        authors: fm.authors?.map((a: any) => a.name).join(', '),
      });
      console.log(`  ${fm.title} (${lang})`);
    }
  }

  writeFileSync('public/search-index.json', JSON.stringify({ documents }));
  console.log(`\nDone: ${documents.length} documents → public/search-index.json`);
}

main().catch(console.error);
