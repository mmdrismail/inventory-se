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

const textMeta = new WeakMap();
const attrMeta = new WeakMap();

const shouldSkipText = (core) => {
  if (!core || core.length < 2) return true;
  if (!/[A-Za-z\u0980-\u09FF]/.test(core)) return true;
  if (SKIP_EXACT.has(core.toLowerCase())) return true;
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

  // Target English: if pure English source, restore exact original text immediately
  if (lang === 'en' && !hasBn) {
    return core;
  }

  // Direct lexicon / cache lookup (with trailing colon support like "Subtotal:")
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

  // Avoid altering strings that already contain Bangla when viewing Bangla/Banglish
  if (lang !== 'en' && hasBn) {
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

const translateTextNode = (node, lang) => {
  const parent = node.parentElement;
  if (!parent || isElementSkipped(parent)) return;

  let meta = textMeta.get(node);
  const currentVal = node.nodeValue;
  if (!meta) {
    meta = { source: currentVal, lastApplied: currentVal };
    textMeta.set(node, meta);
  } else if (currentVal !== meta.lastApplied) {
    // React or application code dynamically changed this node's text
    meta.source = currentVal;
    meta.lastApplied = currentVal;
  }

  const allowOnline = parent.tagName !== 'OPTION';
  const nextVal = translatePreservingWhitespace(meta.source, lang, allowOnline);
  if (currentVal !== nextVal) {
    meta.lastApplied = nextVal;
    node.nodeValue = nextVal;
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

    const next = translatePreservingWhitespace(meta.source, lang);
    if (current !== next) {
      meta.lastApplied = next;
      el.setAttribute(attr, next);
    }
  }
};

export const applyDomTranslation = (root, lang) => {
  if (typeof document === 'undefined' || !root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, lang);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root !== document.body) return;
  if (root.nodeType === Node.ELEMENT_NODE && isElementSkipped(root)) return;

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttrs(root, lang);
  }

  const attrWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let elNode = attrWalker.nextNode();
  while (elNode) {
    if (!isElementSkipped(elNode)) {
      translateElementAttrs(elNode, lang);
    }
    elNode = attrWalker.nextNode();
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    translateTextNode(textNode, lang);
    textNode = textWalker.nextNode();
  }
};

export const startDomTranslator = (getLanguage) => {
  if (typeof document === 'undefined' || !document.body) {
    return () => {};
  }

  let rafId = null;
  let dirtyRoots = new Set();

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
        schedule(node);
      } else if (m.type === 'attributes') {
        const el = m.target;
        const map = attrMeta.get(el);
        const attrMetaEntry = map?.[m.attributeName];
        if (attrMetaEntry && el.getAttribute(m.attributeName) === attrMetaEntry.lastApplied) continue;
        schedule(el);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE || added.nodeType === Node.ELEMENT_NODE) {
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
