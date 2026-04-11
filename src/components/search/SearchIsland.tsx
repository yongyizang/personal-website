import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import Fuse from 'fuse.js';

interface SearchDoc {
  id: string;
  type: 'blog';
  title: { en?: string; zh?: string };
  summary: { en?: string; zh?: string };
  url: { en?: string; zh?: string };
  authors?: string;
}

interface Props {
  locale: 'en' | 'zh';
}

const labels = {
  en: { placeholder: 'Search posts...', noResults: 'No results found.' },
  zh: { placeholder: '搜索文章...', noResults: '未找到结果。' },
};

export default function SearchIsland({ locale }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [focused, setFocused] = useState(false);
  const fuseRef = useRef<Fuse<SearchDoc> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const l = labels[locale];

  useEffect(() => {
    fetch('/search-index.json')
      .then(r => r.json())
      .then(data => {
        fuseRef.current = new Fuse(data.documents, {
          keys: [
            { name: `title.${locale}`, weight: 3 },
            { name: 'title.en', weight: 2 },
            { name: `summary.${locale}`, weight: 1 },
            { name: 'summary.en', weight: 0.8 },
            { name: 'authors', weight: 1.5 },
          ],
          threshold: 0.35,
          includeScore: true,
          minMatchCharLength: 2,
        });
      })
      .catch(() => {});
  }, [locale]);

  const doSearch = useCallback((q: string) => {
    if (!fuseRef.current || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const hits = fuseRef.current.search(q, { limit: 8 });
    setResults(hits.map(h => h.item));
  }, []);

  const handleInput = useCallback((e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 120);
  }, [doSearch]);

  const showResults = focused && query.trim().length >= 2;

  return (
    <div class="search-island">
      <div class={`search-box ${focused ? 'focused' : ''}`}>
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={l.placeholder}
          value={query}
          onInput={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
      </div>

      {showResults && (
        <div class="search-dropdown">
          {results.length === 0 ? (
            <div class="search-empty">{l.noResults}</div>
          ) : (
            results.map((doc, i) => (
              <a
                key={doc.id}
                href={(doc.url as Record<string, string>)[locale] || doc.url.en}
                class="search-hit"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div class="hit-top">
                  <span class="hit-type">{doc.type}</span>
                  <span class="hit-title">
                    {(doc.title as Record<string, string>)[locale] || doc.title.en}
                  </span>
                </div>
                {((doc.summary as Record<string, string>)?.[locale] || doc.summary?.en) && (
                  <div class="hit-summary">
                    {(doc.summary as Record<string, string>)[locale] || doc.summary.en}
                  </div>
                )}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
