/**
 * Typed loaders for the YAML content files under src/content/.
 *
 * These run at build time (Node fs), so there's no runtime cost.
 * Edit the YAML files — not this loader — to change site content.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

export type Locale = 'en' | 'zh';

export interface SiteConfig {
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  profileImage: string;
  links: Array<{ label: string; url: string }>;
}

export interface NewsItem {
  date: string;
  en: string;
  zh: string;
}

function readYaml<T>(relPath: string): T {
  const abs = join(process.cwd(), 'src/content', relPath);
  return YAML.parse(readFileSync(abs, 'utf-8')) as T;
}

export const site: SiteConfig = readYaml<SiteConfig>('site.yaml');
export const news: NewsItem[] = readYaml<NewsItem[]>('news.yaml');
