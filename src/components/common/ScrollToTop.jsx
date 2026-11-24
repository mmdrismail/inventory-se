import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { scrollRestorationEngine } from '../../services/scrollRestorationEngine';

/**
 * Universal Scroll Restoration & Navigation Component
 * -------------------------------------------------------------
 * Intelligently determines whether a navigation event should:
 * 1. Restore exact prior scroll position & item anchor (on Back/POP and return-to-list)
 * 2. Smoothly scroll to a hash anchor (#section)
 * 3. Reset scroll position to top (on fresh forward navigations)
 */
export const ScrollToTop = () => {
  const location = useLocation();
  const navType = useNavigationType(); // 'POP' | 'PUSH' | 'REPLACE'
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const { pathname, search, hash, state } = location;
    const prevPath = prevPathRef.current;
    prevPathRef.current = pathname;

    // 1. Hash Navigation (#section)
    if (hash) {
      const timer = setTimeout(() => {
        const id = hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }

    // 2. Determine if this route transition is a return / back navigation
    const isPop = navType === 'POP';
    const isExplicitBack =
      Boolean(state?.isBackNavigation) || scrollRestorationEngine.consumeBackFlag();
    const isHierarchicalReturn = scrollRestorationEngine.isReturnToList(prevPath, pathname);

    const shouldRestoreScroll = isPop || isExplicitBack || isHierarchicalReturn;

    if (shouldRestoreScroll) {
      const saved = scrollRestorationEngine.getPosition(pathname);
      if (saved && (saved.y > 0 || saved.anchor)) {
        scrollRestorationEngine.restoreScroll(saved.y, saved.anchor);
        return;
      }
    }

    // 3. Fresh forward navigation to a different main module -> start at top
    scrollRestorationEngine.scrollToTop();
  }, [location, navType]);

  return null;
};

export default ScrollToTop;
