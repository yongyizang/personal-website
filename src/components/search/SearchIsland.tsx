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

// How long the dropdown stays mounted after closing, for its exit animation.
// Matches `dropOut` in styles/_search.scss.
const EXIT_MS = 140;

export default function SearchIsland({ locale }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const fuseRef = useRef<Fuse<SearchDoc> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
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
    setActive(-1);
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

  const urlOf = (doc: SearchDoc) => (doc.url as Record<string, string>)[locale] || doc.url.en;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (results.length === 0) return;
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(i => (i + step + results.length + (i < 0 && step < 0 ? 1 : 0)) % results.length);
    } else if (e.key === 'Enter') {
      const href = active >= 0 && results[active] ? urlOf(results[active]) : undefined;
      // Clicking the link (rather than setting location) keeps the client router in charge.
      if (href) document.querySelector<HTMLAnchorElement>(`.search-hit[href="${href}"]`)?.click();
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  };

  const showResults = focused && query.trim().length >= 2;

  // Keep the dropdown (and what it last showed) around while it animates out.
  const lastShown = useRef(results);
  if (showResults) lastShown.current = results;
  const shown = showResults ? results : lastShown.current;

  useEffect(() => {
    if (showResults) {
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [showResults]);

  return (
    <div class="search-island">
      <div class={`search-box ${focused ? 'focused' : ''}`}>
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={l.placeholder}
          aria-expanded={showResults}
          aria-controls="search-results"
          aria-activedescendant={active >= 0 ? `search-hit-${active}` : undefined}
          autocomplete="off"
          spellcheck={false}
          placeholder={l.placeholder}
          value={query}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
      </div>

      {(showResults || mounted) && (
        <div id="search-results" role="listbox" class={`search-dropdown ${showResults ? '' : 'closing'}`}>
          {shown.length === 0 ? (
            <div class="search-empty">{l.noResults}</div>
          ) : (
            shown.map((doc, i) => (
              <a
                key={doc.id}
                id={`search-hit-${i}`}
                role="option"
                aria-selected={i === active}
                href={urlOf(doc)}
                class={`search-hit ${i === active ? 'active' : ''}`}
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
