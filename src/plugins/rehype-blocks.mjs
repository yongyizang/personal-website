/**
 * Small structural upgrades to ordinary Markdown blocks, so posts need no
 * components for the common cases:
 *
 *   tables        wrapped so a wide one scrolls sideways instead of breaking
 *                 the page; a paragraph right after it that starts with
 *                 "Table 1:" (or "表 1：") becomes its caption
 *   images        an image on its own line becomes a <figure> when it has a
 *                 title — ![alt](src "Caption") — or is followed by a
 *                 paragraph starting with "Figure 1:" (or "图 1：")
 *   code blocks   wrapped with their language label and a copy button
 *   <details>     a block the reader unfolds: its label gets a chevron and the
 *                 content a wrapper whose height can be animated
 *
 * Styling lives in styles/prose.scss; the copy button's click handler and the
 * unfolding animation are in layouts/BlogLayout.astro.
 */

const labels = {
  en: { copy: 'Copy', copied: 'Copied', details: 'Details' },
  zh: { copy: '复制', copied: '已复制', details: '详情' },
};

const TABLE_CAPTION = /^(?:Table|表)\s*[\p{L}\p{N}.-]*\s*[:：]/u;
const FIGURE_CAPTION = /^(?:Figure|Fig\.?|图)\s*[\p{L}\p{N}.-]*\s*[:：]/u;

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties: properties ?? {}, children });
const txt = value => ({ type: 'text', value });
const isEl = (node, tagName) => node?.type === 'element' && (!tagName || node.tagName === tagName);
const isBlank = node => node.type === 'text' && !node.value.trim();

// HTML written in an .mdx post arrives as an MDX JSX node, not as an element.
const isJsx = node => node?.type === 'mdxJsxFlowElement' || node?.type === 'mdxJsxTextElement';
const isTag = (node, tagName) => isEl(node, tagName) || (isJsx(node) && node.name === tagName);

const addClass = (node, name) => {
  if (isJsx(node)) {
    const attribute = node.attributes.find(a => a.type === 'mdxJsxAttribute' && (a.name === 'class' || a.name === 'className'));
    if (!attribute) node.attributes.push({ type: 'mdxJsxAttribute', name: 'class', value: name });
    else if (typeof attribute.value === 'string') attribute.value += ` ${name}`;
    return;
  }
  const current = node.properties.className ?? [];
  node.properties.className = [...(Array.isArray(current) ? current : String(current).split(/\s+/)), name];
};

const icon = (className, paths, { size = 15, box = 24, stroke = 2 } = {}) =>
  el(
    'svg',
    { className: [className], width: size, height: size, viewBox: `0 0 ${box} ${box}`, fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', ariaHidden: 'true' },
    paths,
  );

export default function rehypeBlocks() {
  return (tree, file) => {
    const t = labels[file.data?.astro?.frontmatter?.lang === 'zh' ? 'zh' : 'en'];

    /**
     * If the next sibling of `kids[index]` is a paragraph that opens with a
     * caption label, remove it and return its content with the label set bold.
     */
    const takeCaption = (kids, index, pattern) => {
      let next = index + 1;
      while (next < kids.length && isBlank(kids[next])) next++;
      const paragraph = kids[next];
      const first = paragraph?.children?.[0];
      if (!isEl(paragraph, 'p') || first?.type !== 'text') return null;
      const match = first.value.match(pattern);
      if (!match) return null;
      kids.splice(index + 1, next - index);
      return [
        el('strong', { className: ['caption-label'] }, [txt(match[0])]),
        txt(first.value.slice(match[0].length)),
        ...paragraph.children.slice(1),
      ];
    };

    const table = (kids, index) => {
      const caption = takeCaption(kids, index, TABLE_CAPTION);
      kids[index] = el('figure', { className: ['table-figure'] }, [
        el('div', { className: ['table-scroll'] }, [kids[index]]),
        ...(caption ? [el('figcaption', {}, caption)] : []),
      ]);
    };

    // A paragraph holding nothing but an image (optionally wrapped in a link).
    const loneImage = paragraph => {
      const inner = paragraph.children.filter(child => !isBlank(child));
      if (inner.length !== 1) return null;
      if (isEl(inner[0], 'img')) return inner[0];
      const linked = isEl(inner[0], 'a') ? inner[0].children.filter(child => !isBlank(child)) : [];
      return linked.length === 1 && isEl(linked[0], 'img') ? linked[0] : null;
    };

    const image = (kids, index, img) => {
      let caption = takeCaption(kids, index, FIGURE_CAPTION);
      if (!caption && img.properties?.title) {
        const title = String(img.properties.title);
        const label = title.match(FIGURE_CAPTION)?.[0] ?? '';
        caption = [...(label ? [el('strong', { className: ['caption-label'] }, [txt(label)])] : []), txt(title.slice(label.length))];
      }
      if (!caption) return;
      delete img.properties.title;
      kids[index] = el('figure', { className: ['image-figure'] }, [
        ...kids[index].children.filter(child => !isBlank(child)),
        el('figcaption', {}, caption),
      ]);
    };

    const code = (kids, index) => {
      const pre = kids[index];
      const language = pre.properties?.dataLanguage;
      kids[index] = el('div', { className: ['code-block'], dataLang: language && language !== 'plaintext' && language !== 'text' ? language : undefined }, [
        el('button', { type: 'button', className: ['copy-button'], ariaLabel: t.copy, dataCopied: t.copied }, [
          icon('icon-copy', [
            el('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
            el('path', { d: 'M5 15V6a2 2 0 0 1 2-2h9' }),
          ]),
          icon('icon-check', [el('path', { d: 'm5 12.5 4.5 4.5L19 7.5' })]),
        ]),
        pre,
      ]);
    };

    // <details>: label and chevron in the summary, everything else in one
    // wrapper. Returns the wrapper so the blocks inside it are handled too.
    const fold = details => {
      const kids = details.children.filter(child => !isBlank(child));
      const summary = kids.find(child => isTag(child, 'summary')) ?? el('summary', {}, [txt(t.details)]);
      // A summary written across several lines holds a paragraph; the label is its content.
      const inner = summary.children.filter(child => !isBlank(child));
      const label = inner.length === 1 && isEl(inner[0], 'p') ? inner[0].children : summary.children;
      summary.children = [
        el('span', { className: ['fold-label'] }, label),
        // The same chevron as the toggles on the home page.
        icon('fold-chevron', [el('path', { d: 'M2.5 4.5 6 8l3.5-3.5' })], { size: 11, box: 12, stroke: 1.5 }),
      ];
      const body = el('div', { className: ['fold-body'] }, kids.filter(child => child !== summary));
      details.children = [summary, body];
      addClass(details, 'fold');
      return body;
    };

    const walk = parent => {
      const kids = parent.children;
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const node = kids[i];
        if (isEl(node, 'table')) {
          walk(node);
          table(kids, i);
        } else if (isTag(node, 'details')) {
          walk(fold(node));
        } else if (isEl(node, 'pre')) {
          code(kids, i);
        } else if (isEl(node, 'p') && loneImage(node)) {
          image(kids, i, loneImage(node));
        } else {
          walk(node);
        }
      }
    };

    walk(tree);
  };
}
