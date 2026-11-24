/**
 * StockLine Universal Scroll & Navigation Engine (স্ক্রোল ও নেভিগেশন ইঞ্জিন)
 * ----------------------------------------------------------------------------
 * Features:
 * 1. Intelligent Route Scroll Registry (In-memory + SessionStorage persistence)
 * 2. Adaptive Multi-Frame & DOM Mutation Scroll Restoration (prevents premature clamping)
 * 3. Item Anchor Memory (remembers clicked card/row so it centers back into view)
 * 4. Automatic Hierarchical Return-to-List Detection (e.g. /customers/:id -> /customers)
 * 5. Native History POP & Smart Back Support
 * 6. Forward-Navigation Reset (clean scroll-to-top on fresh module switches)
 */

const STORAGE_KEY = 'stockline_scroll_registry';

class ScrollRestorationEngine {
  constructor() {
    this.registry = this.loadRegistry();
    this.lastClickedAnchor = null;
    this.currentPathname = typeof window !== 'undefined' ? window.location.pathname : '';
    this.isBackNavigationTriggered = false;
    this.activeRestorationId = null;

    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  loadRegistry() {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return new Map();
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  }

  saveRegistry() {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const obj = Object.fromEntries(this.registry);
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  normalizePath(path) {
    if (!path) return '/';
    // Remove trailing slash except for root
    const clean = path.replace(/\/+$/, '') || '/';
    return clean;
  }

  /**
   * Record current scroll position for a route
   */
  recordPosition(path, y = window.scrollY, anchor = this.lastClickedAnchor) {
    const key = this.normalizePath(path);
    this.registry.set(key, {
      x: window.scrollX || 0,
      y: Math.max(0, y),
      anchor: anchor || null,
      timestamp: Date.now(),
    });
    this.saveRegistry();
  }

  /**
   * Retrieve saved scroll position for a route
   */
  getPosition(path) {
    const key = this.normalizePath(path);
    return this.registry.get(key) || null;
  }

  /**
   * Set flag when a Back button or Back link is pressed
   */
  setBackNavigationFlag() {
    this.isBackNavigationTriggered = true;
  }

  consumeBackFlag() {
    const flag = this.isBackNavigationTriggered;
    this.isBackNavigationTriggered = false;
    return flag;
  }

  /**
   * Detect whether moving from fromPath to toPath represents a return to a parent/list view
   */
  isReturnToList(fromPath, toPath) {
    const from = this.normalizePath(fromPath);
    const to = this.normalizePath(toPath);

    if (from === to) return false;

    // Direct parent/child relationship: e.g. /customers/123 -> /customers
    if (from.startsWith(to + '/') || from.startsWith(to + '?')) {
      return true;
    }

    // Known list-detail and form hierarchies
    const moduleLists = [
      { parent: '/customers', children: ['/customers/'] },
      { parent: '/products', children: ['/products/'] },
      { parent: '/suppliers', children: ['/suppliers/'] },
      { parent: '/purchases', children: ['/purchases/'] },
      { parent: '/sales', children: ['/sales/'] },
      { parent: '/quotations', children: ['/quotations/'] },
      { parent: '/orders', children: ['/orders/'] },
      { parent: '/my-orders', children: ['/my-orders/'] },
      { parent: '/shop', children: ['/shop/products/'] },
      { parent: '/cart', children: ['/checkout'] },
      { parent: '/inventory', children: ['/inventory/adjust'] },
    ];

    for (const mod of moduleLists) {
      if (to === mod.parent && mod.children.some((c) => from.startsWith(c))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adaptive Multi-Frame Scroll Restoration
   * Continues to re-evaluate and restore scroll as DOM elements populate and layout expands.
   */
  restoreScroll(targetY, anchor = null, onComplete) {
    if (typeof window === 'undefined') return;

    if (this.activeRestorationId) {
      cancelAnimationFrame(this.activeRestorationId);
      this.activeRestorationId = null;
    }

    let attempts = 0;
    const maxAttempts = 35; // ~500-600ms across animation frames

    const attempt = () => {
      // 1. If we have a specific item anchor (e.g. clicked customer or product card), try to locate it
      if (anchor) {
        const el =
          document.getElementById(anchor) ||
          document.querySelector(`[data-item-id="${anchor}"]`) ||
          document.querySelector(`[data-scroll-anchor="${anchor}"]`) ||
          document.getElementById(`customer-item-${anchor}`) ||
          document.getElementById(`product-item-${anchor}`) ||
          document.getElementById(`supplier-item-${anchor}`) ||
          document.getElementById(`sale-item-${anchor}`) ||
          document.getElementById(`purchase-item-${anchor}`) ||
          document.getElementById(`quotation-item-${anchor}`) ||
          document.getElementById(`order-item-${anchor}`);

        if (el) {
          try {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
            if (onComplete) onComplete();
            return;
          } catch {
            // fallback to coordinate scroll
          }
        }
      }

      // 2. Fall back to targetY coordinate
      const currentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const windowHeight = window.innerHeight || 800;
      const maxScroll = Math.max(0, currentHeight - windowHeight);

      if (maxScroll >= targetY || attempts >= maxAttempts) {
        window.scrollTo({
          top: Math.min(targetY, maxScroll),
          left: 0,
          behavior: 'instant',
        });
        if (onComplete) onComplete();
        return;
      }

      // If document height is still expanding (e.g. React cards still rendering), retry on next frame
      attempts++;
      this.activeRestorationId = requestAnimationFrame(attempt);
    };

    // Immediate first attempt
    attempt();
  }

  /**
   * Scroll smoothly or instantly to top for fresh new pages
   */
  scrollToTop() {
    if (typeof window === 'undefined') return;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }

  /**
   * Global event listeners for non-intrusive tracking
   */
  initListeners() {
    let scrollTimeout = null;

    // Passive scroll position tracker
    window.addEventListener(
      'scroll',
      () => {
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(() => {
          this.recordPosition(window.location.pathname, window.scrollY);
        });
      },
      { passive: true }
    );

    // Global click listener to capture clicked item anchor / card ID
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target;
        if (!target) return;

        // Find closest link, button, or card
        const cardOrItem = target.closest(
          '[data-item-id], [data-scroll-anchor], .customer-card, .product-card, tr[data-id], [id^="customer-item-"], [id^="product-item-"]'
        );

        if (cardOrItem) {
          const anchor =
            cardOrItem.getAttribute('data-item-id') ||
            cardOrItem.getAttribute('data-scroll-anchor') ||
            cardOrItem.id;
          if (anchor) {
            this.lastClickedAnchor = anchor;
            this.recordPosition(window.location.pathname, window.scrollY, anchor);
          }
        }

        // Check if clicking a back link
        const backBtn = target.closest('[data-back-link], .back-to-list-link');
        if (backBtn) {
          this.setBackNavigationFlag();
        }
      },
      { capture: true, passive: true }
    );
  }
}

export const scrollRestorationEngine = new ScrollRestorationEngine();
export default scrollRestorationEngine;
