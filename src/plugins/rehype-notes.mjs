/**
 * Footnotes and citations → margin notes.
 *
 * Posts are written in plain Markdown:
 *
 *   A claim that needs a caveat.[^1]          ← footnote
 *   Low-rank adaptation [@hu2021lora] …       ← citation; the key comes from
 *                                               `bibliography` in the frontmatter
 *   [^1]: The caveat.
 *
 * Each becomes a small marker in the text with its note attached right beside
 * it. styles/prose.scss sets the note in the margin on wide screens and turns
 * the marker into a tap-to-open toggle on narrow ones. The toggle is a
 * checkbox, so all of this works without JavaScript.
 *
 * Cited works are numbered in the order they first appear and listed in a
 * "References" section appended to the post. A bibliography entry may carry a
 * `note` (what exactly was taken from the source); it is shown under the entry
 * in that list. To introduce the list in your own words, end the post with a
 * "## References" (or "## 参考文献") heading and a paragraph: the list is then
 * appended to those instead of to a generated heading.
 */

const labels = {
  en: { references: 'References', note: 'Note', citation: 'Reference' },
  zh: { references: '参考文献', note: '注释', citation: '文献' },
};

// Text inside these is left alone: code stays literal, and notes inside links,
// headings or the label of a <details> would break the link / leak into the
// table of contents / fold the block when clicked.
const SKIP = new Set(['code', 'pre', 'kbd', 'samp', 'script', 'style', 'svg', 'math', 'a', 'button', 'label', 'summary', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// Pandoc-style keys: [@key] or [@one; @two]
const KEY = String.raw`@[\p{L}\p{N}_](?:[\p{L}\p{N}_:.#$%&+?<>~/-]*[\p{L}\p{N}_])?`;
const CITATION = new RegExp(String.raw`\[\s*(${KEY}(?:\s*[;,]\s*${KEY})*)\s*\]`, 'gu');

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties: properties ?? {}, children });
const txt = value => ({ type: 'text', value });
const isEl = (node, tagName) => node?.type === 'element' && (!tagName || node.tagName === tagName);
const isBlank = node => node.type === 'text' && !node.value.trim();
const has = (node, prop) => node.properties?.[prop] !== undefined && node.properties[prop] !== false;
// "Hu et al." already ends its sentence; "Hu and Shen" does not.
const fullStop = text => (/[.?!。？！]$/.test(text) ? '' : '.');
const sentence = text => text + fullStop(text);
const classesOf = node => {
  const value = node.properties?.className ?? node.properties?.class;
  return Array.isArray(value) ? value : typeof value === 'string' ? value.split(/\s+/) : [];
};

export default function rehypeNotes() {
  return (tree, file) => {
    const frontmatter = file.data?.astro?.frontmatter ?? {};
    const t = labels[frontmatter.lang === 'zh' ? 'zh' : 'en'];

    const bibliography = new Map();
    for (const entry of Array.isArray(frontmatter.bibliography) ? frontmatter.bibliography : []) {
      if (entry?.key) bibliography.set(String(entry.key), entry);
    }

    // ── Footnote definitions ────────────────────────────────────
    // GFM collects them in a <section data-footnotes> at the end of the document.
    const sectionIndex = tree.children.findIndex(node => isEl(node, 'section') && has(node, 'dataFootnotes'));
    const section = sectionIndex >= 0 ? tree.children[sectionIndex] : null;
    const list = section?.children.find(node => isEl(node, 'ol'));
    const definitions = new Map(); // "#id" → { item, content }
    for (const item of list?.children ?? []) {
      if (isEl(item, 'li') && item.properties?.id) {
        definitions.set(`#${item.properties.id}`, { item, content: phrasing(item) });
      }
    }

    const order = new Map(); // citation key → number, in order of first appearance
    const citedBefore = new Set();
    const seenFootnotes = new Set();
    const converted = new Set(); // footnotes that moved next to their marker
    const kept = new Set(); // footnotes still referenced from where a note can't go
    const warned = new Set();
    let count = 0;

    const numberOf = key => {
      if (!order.has(key)) order.set(key, order.size + 1);
      return order.get(key);
    };

    // ── One pass over the text, in reading order ────────────────
    const walk = (parent, flags) => {
      const out = [];
      for (const node of parent.children) {
        if (node.type === 'text') {
          out.push(...(flags.skip ? [node] : expandCitations(node, flags)));
          continue;
        }

        const ref = footnoteRef(node);
        if (ref) {
          const definition = definitions.get(ref.properties.href);
          if (definition?.content && !flags.skip) {
            converted.add(ref.properties.href);
            out.push(footnote(ref, definition.content, flags));
          } else {
            kept.add(ref.properties.href);
            out.push(node);
          }
          continue;
        }

        if (node.children) {
          const name = node.tagName ?? node.name; // `name` on MDX JSX elements
          walk(node, {
            skip: flags.skip || SKIP.has(name) || has(node, 'dataFootnotes') || classesOf(node).some(c => c === 'katex' || c === 'katex-display'),
            // Inside a table the margin isn't reachable (the table scrolls), and a
            // <details> block is an aside of its own, so notes there open in place.
            inline: flags.inline || name === 'table' || name === 'details',
          });
        }
        out.push(node);
      }
      parent.children = out;
    };

    // The word joiner keeps the marker on the same line as the word it follows
    // (Chinese text may otherwise break the line right before it).
    const marker = (id, label, name, note, inline, kind) =>
      el('span', { className: ['note-ref', kind, ...(inline ? ['note-inline'] : [])] }, [
        txt('\u2060'),
        el('label', { htmlFor: id, className: ['note-mark'] }, [txt(label)]),
        el('input', { type: 'checkbox', id, className: ['note-toggle'], ariaLabel: name }),
        el('span', { className: ['sidenote'], role: 'note' }, note),
      ]);

    const footnote = (ref, content, flags) => {
      const label = textOf(ref) || String(count + 1);
      const href = ref.properties.href;
      const repeat = seenFootnotes.has(href);
      seenFootnotes.add(href);
      const note = structuredClone(content);
      // A citation inside a footnote becomes a plain reference number, not a note within a note.
      expandInNote(note);
      return marker(
        `note-${++count}`,
        label,
        `${t.note} ${label}`,
        [el('span', { className: ['sidenote-mark'] }, [txt(label)]), txt(' '), ...note],
        flags.inline || repeat,
        'footnote-ref',
      );
    };

    // One work, as it reads in a note: "[2] Title. Authors, Year." The venue
    // is left to the full list at the end; the margin is narrow.
    const entry = (key, repeat) => {
      const work = bibliography.get(key);
      const href = work.url || (work.doi ? `https://doi.org/${work.doi}` : null);
      const title = String(work.title ?? key);
      const meta = sentence([work.authors, work.year].filter(Boolean).join(', '));
      return el('span', { className: ['cite-entry', ...(repeat ? ['cite-repeat'] : [])] }, [
        el('span', { className: ['sidenote-mark'] }, [txt(`[${numberOf(key)}]`)]),
        txt(' '),
        href ? el('a', { href, className: ['cite-title'], target: '_blank', rel: ['noopener'] }, [txt(title)]) : el('span', { className: ['cite-title'] }, [txt(title)]),
        txt(fullStop(title)),
        ...(meta !== '.' ? [txt(' '), el('span', { className: ['cite-meta'] }, [txt(meta)])] : []),
      ]);
    };

    const citation = (written, flags) => {
      written.forEach(numberOf); // numbered in the order written…
      const keys = [...new Set(written)].sort((a, b) => numberOf(a) - numberOf(b)); // …shown in numeric order
      const numbers = keys.map(numberOf).join(', ');
      // The first time a work is cited its details go in the margin; after
      // that the marker alone is enough, and opens the note in place on demand.
      // (In a group, works already shown are marked so the margin skips them.)
      const note = keys.map(key => entry(key, citedBefore.has(key)));
      const repeat = keys.every(key => citedBefore.has(key));
      keys.forEach(key => citedBefore.add(key));
      return marker(`note-${++count}`, `[${numbers}]`, `${t.citation} ${numbers}`, note, flags.inline || repeat, 'cite-ref');
    };

    const parseKeys = raw => raw.split(/\s*[;,]\s*/).map(key => key.replace(/^@/, ''));

    const knownKeys = raw => {
      const keys = parseKeys(raw);
      const missing = keys.filter(key => !bibliography.has(key));
      for (const key of missing) {
        if (warned.has(key)) continue;
        warned.add(key);
        console.warn(`[notes] ${file.path ?? 'post'}: citation [@${key}] has no matching entry in the frontmatter \`bibliography\`; left as written.`);
      }
      return missing.length ? null : keys;
    };

    // Split a text node around every [@key] it contains.
    const expandCitations = (node, flags) => {
      if (bibliography.size === 0 || !node.value.includes('[@')) return [node];
      const out = [];
      let last = 0;
      for (const match of node.value.matchAll(CITATION)) {
        const keys = knownKeys(match[1]);
        if (!keys) continue;
        // Markers hug the word before them, as footnote numbers do.
        const before = node.value.slice(last, match.index).replace(/[ \t]+$/, '');
        if (before) out.push(txt(before));
        out.push(citation(keys, flags));
        last = match.index + match[0].length;
      }
      if (last === 0) return [node];
      if (last < node.value.length) out.push(txt(node.value.slice(last)));
      return out;
    };

    const expandInNote = nodes => {
      for (const node of nodes) {
        if (node.type === 'text') {
          node.value = node.value.replace(CITATION, (whole, raw) => {
            const keys = knownKeys(raw);
            return keys ? `[${keys.map(numberOf).join(', ')}]` : whole;
          });
        } else if (node.children && !SKIP.has(node.tagName)) {
          expandInNote(node.children);
        }
      }
    };

    walk(tree, { skip: false, inline: false });

    // ── Tidy the original footnote list ─────────────────────────
    // Notes now living beside their markers leave it; anything that couldn't
    // move (block content such as lists or code) stays as a regular footnote.
    if (section && list) {
      list.children = list.children.filter(item => {
        const href = isEl(item, 'li') && item.properties?.id ? `#${item.properties.id}` : null;
        return !href || !converted.has(href) || kept.has(href);
      });
      if (!list.children.some(item => isEl(item, 'li'))) tree.children.splice(sectionIndex, 1);
    }

    // ── References ──────────────────────────────────────────────
    if (bibliography.size > 0 && !usesComponent(tree, 'Bibliography')) {
      const entries = [...order.keys(), ...[...bibliography.keys()].filter(key => !order.has(key))].map(key => bibliography.get(key));
      const opening = takeOwnHeading(tree, Object.values(labels).map(label => label.references)) ?? [el('h2', {}, [txt(t.references)])];
      tree.children.push(
        txt('\n'),
        el('section', { className: ['references'] }, [
          ...opening,
          el('ol', {}, entries.map(entry => el('li', { id: `ref-${entry.key}` }, referenceNodes(entry)))),
        ]),
      );
    }
  };
}

/**
 * If the post ends with its own references heading (optionally followed by
 * introductory paragraphs), remove those nodes from the tree and return them.
 */
function takeOwnHeading(tree, names) {
  const kids = tree.children;
  let end = kids.length;
  // Step back over trailing whitespace and any footnote list left at the very end.
  while (end > 0 && (isBlank(kids[end - 1]) || (isEl(kids[end - 1], 'section') && has(kids[end - 1], 'dataFootnotes')))) end--;
  let start = end;
  while (start > 0 && (isBlank(kids[start - 1]) || isEl(kids[start - 1], 'p'))) start--;
  const heading = kids[start - 1];
  if (!isEl(heading, 'h2') || !names.includes(textOf(heading).trim())) return null;
  return kids.splice(start - 1, end - start + 1).filter(node => !isBlank(node));
}

/** `<sup><a data-footnote-ref href="#…">1</a></sup>` → the inner link. */
function footnoteRef(node) {
  if (!isEl(node, 'sup')) return null;
  const inner = node.children.filter(child => !isBlank(child));
  return inner.length === 1 && isEl(inner[0], 'a') && has(inner[0], 'dataFootnoteRef') ? inner[0] : null;
}

const textOf = node => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(''));

/**
 * A footnote's content as inline nodes, or null when it holds block content
 * (lists, code, quotes…) that cannot sit inside a paragraph.
 */
function phrasing(item) {
  const blocks = item.children.filter(node => !isBlank(node));
  if (blocks.length === 0 || !blocks.every(node => isEl(node, 'p'))) return null;
  return blocks.flatMap((paragraph, i) => {
    const kids = structuredClone(paragraph.children).filter(node => !(isEl(node, 'a') && has(node, 'dataFootnoteBackref')));
    while (kids.length && isBlank(kids.at(-1))) kids.pop();
    const last = kids.at(-1);
    if (last?.type === 'text') last.value = last.value.replace(/\s+$/, '');
    return i === 0 ? kids : [el('span', { className: ['note-p'] }, kids)];
  });
}

function referenceNodes(entry) {
  const href = entry.url || (entry.doi ? `https://doi.org/${entry.doi}` : null);
  const title = String(entry.title ?? entry.key);
  const nodes = [];
  if (entry.authors) nodes.push(el('span', { className: ['ref-authors'] }, [txt(sentence(String(entry.authors)))]), txt(' '));
  nodes.push(href ? el('a', { href, className: ['ref-title'], target: '_blank', rel: ['noopener'] }, [txt(title)]) : el('span', { className: ['ref-title'] }, [txt(title)]));
  const where = [entry.venue, entry.year].filter(Boolean).join(', ');
  nodes.push(txt(fullStop(title) + (where ? ` ${sentence(where)}` : '')));
  if (entry.doi && entry.url) {
    nodes.push(txt(' '), el('a', { href: `https://doi.org/${entry.doi}`, className: ['ref-doi'], target: '_blank', rel: ['noopener'] }, [txt(`doi:${entry.doi}`)]));
  }
  if (entry.note) nodes.push(el('span', { className: ['ref-note'] }, [txt(String(entry.note))]));
  return nodes;
}

/** Whether an MDX file renders `<Name … />` itself. */
function usesComponent(node, name) {
  if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === name) return true;
  return (node.children ?? []).some(child => usesComponent(child, name));
}
