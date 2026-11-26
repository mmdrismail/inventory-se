import { translationEngine } from './translationEngine';

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'CODE',
  'PRE',
  'SVG',
  'MATH',
  'KBD',
  'SAMP',
]);

const SKIP_EXACT = new Set([
  'stockline',
  'mongodb',
  'mongodb live',
  'syncing...',
  'local only',
  'ctrl k',
  'trello',
  'trello board',
  'github',
  'github repo',
  'mohammad ismail',
  'saiful ahnm sajed',
  'm/s. shanta refrigeration',
  'মেসার্স শান্তা রেফ্রিজারেশন',
  'stockline enterprise',
  'stockline saas',
  'inventory saas',
  'mern',
  'pos',
  'api',
  'csv',
  'pdf',
  'json',
  'sku',
  'skus',
  'bin',
  'vat',
  'bdt',
  'admin',
  'manager',
  'staff',
  'customer',
]);

const DATE_RE =
  /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(,\s+\d{4})?(\s*[·•]\s*.*)?$/i;
const ID_CODE_RE = /^#?(INV|QT|PO|ORD|SKU|REQ|RFQ|MOV|TEST|BIN)-[A-Z0-9_-]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_OR_PATH_RE = /^(https?:\/\/|\/[a-z0-9/_-]*$|[a-z0-9.-]+\.(app|io|com|org|net)(\/.*)?$)/i;
const PHONE_RE = /^\+?\d[\d\s\-()]{5,}$/;
const IDENTIFIER_KEY_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/;

const textMeta = new WeakMap();
const attrMeta = new WeakMap();

const shouldSkipText = (core) => {
  if (!core || core.length < 2) return true;
  if (!/[A-Za-z\u0980-\u09FF]/.test(core)) return true;
  if (SKIP_EXACT.has(core.toLowerCase())) return true;
  if (IDENTIFIER_KEY_RE.test(core)) return true;
  if (EMAIL_RE.test(core) || DOMAIN_OR_PATH_RE.test(core) || ID_CODE_RE.test(core)) return true;
  if (PHONE_RE.test(core) || DATE_RE.test(core)) return true;
  return false;
};

const isElementSkipped = (el) => {
  if (!el || el.nodeType !== 1) return true;
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.closest('[data-no-translate], .notranslate, code, pre, svg')) return true;
  return false;
};

const translateCore = (core, lang, allowOnline = true) => {
  const hasBn = translationEngine.hasBangla(core);

  if (lang === 'en' && !hasBn) {
    return core;
  }

  const direct = translationEngine.translate(core, lang, '', { allowOnline });
  if (direct && direct !== core) {
    return direct;
  }

  if (core.endsWith(':')) {
    const base = core.slice(0, -1).trim();
    if (base) {
      const baseNorm = translationEngine.normalizeKey(base);
      const exactLex = translationEngine.lexicon.get(baseNorm);
      const cached = translationEngine.memoryCache[`${lang}:${baseNorm}`];
      if (exactLex || cached) {
        const translatedBase = translationEngine.translate(base, lang, '', { allowOnline });
        if (translatedBase && translatedBase !== base) {
          return `${translatedBase}:`;
        }
      }
    }
  }

  if (lang === 'bn' && hasBn) {
    return core;
  }

  return direct || core;
};

const translatePreservingWhitespace = (raw, lang, allowOnline = true) => {
  if (!raw || typeof raw !== 'string') return raw;
  const match = raw.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match) return raw;
  const [, leading, core, trailing] = match;
  if (shouldSkipText(core)) return raw;
  const translated = translateCore(core, lang, allowOnline);
  return `${leading}${translated}${trailing}`;
};

const syncTextNodeSource = (node) => {
  let meta = textMeta.get(node);
  const currentVal = node.nodeValue ?? '';
  if (!meta) {
    meta = { source: currentVal, lastApplied: currentVal };
    textMeta.set(node, meta);
  } else if (currentVal !== meta.lastApplied) {
    meta.source = currentVal;
    meta.lastApplied = currentVal;
  }
  return meta;
};

/**
 * Translate a contiguous run of sibling Text nodes as ONE complete grammatical sentence.
 * Keeps every Text node reference intact in place so React 19 reconciles safely without DOM errors.
 */
const translateTextRun = (run, parentEl, lang) => {
  if (!run || run.length === 0 || !parentEl || isElementSkipped(parentEl)) return;

  const metas = run.map(syncTextNodeSource);
  const rawCombined = metas.map((m) => m.source).join('');
  if (!rawCombined) return;

  const allowOnline = parentEl.tagName !== 'OPTION';
  const nextCombined = translatePreservingWhitespace(rawCombined, lang, allowOnline);

  // When restored back to exact source, restore individual split node values cleanly
  if (nextCombined === rawCombined) {
    for (let i = 0; i < run.length; i++) {
      const node = run[i];
      const meta = metas[i];
      if (node.nodeValue !== meta.source) {
        meta.lastApplied = meta.source;
        node.nodeValue = meta.source;
      }
    }
    return;
  }

  if (run[0].nodeValue !== nextCombined) {
    metas[0].lastApplied = nextCombined;
    run[0].nodeValue = nextCombined;
  }
  for (let i = 1; i < run.length; i++) {
    if (run[i].nodeValue !== '') {
      metas[i].lastApplied = '';
      run[i].nodeValue = '';
    }
  }
};

const TRANSLATABLE_ATTRS = ['placeholder', 'title'];

const translateElementAttrs = (el, lang) => {
  if (!el || el.nodeType !== 1 || isElementSkipped(el)) return;
  let map = attrMeta.get(el);

  for (const attr of TRANSLATABLE_ATTRS) {
    const current = el.getAttribute(attr);
    if (!current) continue;

    if (!map) {
      map = {};
      attrMeta.set(el, map);
    }
    let meta = map[attr];
    if (!meta) {
      meta = { source: current, lastApplied: current };
      map[attr] = meta;
    } else if (current !== meta.lastApplied) {
      meta.source = current;
      meta.lastApplied = current;
    }

    const next = translatePreservingWhitespace(meta.source, lang, true);
    if (current !== next) {
      meta.lastApplied = next;
      el.setAttribute(attr, next);
    }
  }
};

const processElementSubtree = (el, lang) => {
  if (!el || el.nodeType !== 1 || isElementSkipped(el)) return;

  translateElementAttrs(el, lang);

  let textRun = [];
  const flushRun = () => {
    if (textRun.length > 0) {
      translateTextRun(textRun, el, lang);
      textRun = [];
    }
  };

  for (let child = el.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === Node.TEXT_NODE) {
      textRun.push(child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      flushRun();
      processElementSubtree(child, lang);
    }
  }
  flushRun();
};

export const applyDomTranslation = (root, lang) => {
  if (typeof document === 'undefined' || !root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (parent) {
      processElementSubtree(parent, lang);
    }
    return;
  }

  processElementSubtree(root, lang);
};

export const startDomTranslator = (getLanguage) => {
  if (typeof document === 'undefined' || !document.body) {
    return () => {};
  }

  let rafId = null;
  const dirtyRoots = new Set();

  const flush = () => {
    rafId = null;
    const lang = getLanguage();
    const roots = Array.from(dirtyRoots);
    dirtyRoots.clear();

    if (roots.includes(document.body)) {
      applyDomTranslation(document.body, lang);
      return;
    }
    for (const r of roots) {
      if (r && r.isConnected) {
        applyDomTranslation(r, lang);
      }
    }
  };

  const schedule = (target = document.body) => {
    dirtyRoots.add(target || document.body);
    if (rafId === null) {
      rafId = window.requestAnimationFrame(flush);
    }
  };

  // Initial pass
  schedule(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData') {
        const node = m.target;
        const meta = textMeta.get(node);
        if (meta && node.nodeValue === meta.lastApplied) continue;
        schedule(node.parentElement || node);
      } else if (m.type === 'attributes') {
        const el = m.target;
        const map = attrMeta.get(el);
        const attrMetaEntry = map?.[m.attributeName];
        if (attrMetaEntry && el.getAttribute(m.attributeName) === attrMetaEntry.lastApplied) continue;
        schedule(el);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE) {
            schedule(added.parentElement || added);
          } else if (added.nodeType === Node.ELEMENT_NODE) {
            schedule(added);
          }
        });
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANSLATABLE_ATTRS,
  });

  const handleAsyncTranslation = () => schedule(document.body);
  window.addEventListener('stockline:translation-updated', handleAsyncTranslation);

  return () => {
    observer.disconnect();
    window.removeEventListener('stockline:translation-updated', handleAsyncTranslation);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};
