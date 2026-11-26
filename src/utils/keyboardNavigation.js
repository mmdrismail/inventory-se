/**
 * Global keyboard navigation utility for POS, inventory, quotation, and ledger forms.
 * Pressing Enter inside a form control advances focus cleanly to the next editable box
 * instead of stalling on the same field or triggering accidental early form submission.
 */

const SKIPPED_INPUT_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'file',
  'image',
  'checkbox',
  'radio',
  'range',
  'color',
  'search',
]);

const FOCUSABLE_FIELD_SELECTOR = [
  'input:not([disabled]):not([readonly]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="search"])',
  'select:not([disabled])',
  'textarea:not([disabled]):not([readonly])',
].join(', ');

const isElementInteractable = (el) => {
  if (!el || el.disabled || el.readOnly) return false;
  if (el.tabIndex === -1) return false;
  if (el.getAttribute('data-enter-skip') === 'true' || el.getAttribute('data-enter-ignore') === 'true') {
    return false;
  }
  if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0) {
    return false;
  }
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
  }
  return true;
};

export const getEnterNavigationScope = (target) => {
  if (!target || typeof target.closest !== 'function') return null;
  return (
    target.closest('[data-enter-scope]') ||
    target.closest('[role="dialog"]') ||
    target.closest('form') ||
    target.closest('main') ||
    target.ownerDocument?.body ||
    null
  );
};

export const handleFormEnterNavigation = (e) => {
  if (!e || e.key !== 'Enter' || e.defaultPrevented) return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  if (e.nativeEvent?.isComposing) return;

  const target = e.target;
  if (!target || target.nodeType !== 1) return;

  const tag = target.tagName;
  const isNavigableInput =
    tag === 'SELECT' ||
    (tag === 'INPUT' && !SKIPPED_INPUT_TYPES.has((target.type || 'text').toLowerCase()) && !target.readOnly);

  if (!isNavigableInput) return;
  if (target.closest('[data-enter-ignore="true"]')) return;

  const scope = getEnterNavigationScope(target);
  if (!scope) return;

  const fields = Array.from(scope.querySelectorAll(FOCUSABLE_FIELD_SELECTOR)).filter(isElementInteractable);
  const currentIndex = fields.indexOf(target);
  if (currentIndex === -1) return;

  const nextField = fields[currentIndex + 1];
  if (nextField) {
    e.preventDefault();
    if (typeof nextField.focus === 'function') {
      nextField.focus();
    }
    if (nextField.tagName === 'INPUT' && nextField.type === 'number' && typeof nextField.select === 'function') {
      try {
        nextField.select();
      } catch {
        // Ignore selection errors on unsupported input modes
      }
    }
    return;
  }

  // Last field in scope: preserve native form submit only where explicitly opted in (e.g. Login)
  const form = target.closest('form');
  if (form && form.getAttribute('data-enter-submit-last') === 'true') {
    return;
  }

  e.preventDefault();
  const finalBtn = scope.querySelector(
    'button[type="submit"]:not(:disabled), [data-enter-final-button="true"]:not(:disabled)'
  );
  if (finalBtn && isElementInteractable(finalBtn) && typeof finalBtn.focus === 'function') {
    finalBtn.focus();
  }
};
