import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { scrollRestorationEngine } from '../../services/scrollRestorationEngine';

/**
 * Universal BackLink Component
 * Ensures fluid, native-feeling back navigation that:
 * 1. Signals the Scroll Restoration Engine to seamlessly restore exact scroll coordinates.
 * 2. Uses window.history.back() / navigate(-1) when safe to preserve full browser history.
 * 3. Gracefully falls back to the defined 'to' route for direct links and bookmarks.
 */
export const BackLink = ({
  to,
  children,
  className = '',
  icon: Icon = ArrowLeft,
  onClick,
  ...props
}) => {
  const navigate = useNavigate();

  const handleClick = (e) => {
    scrollRestorationEngine.setBackNavigationFlag();

    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }

    // If there is preceding history in the current SPA session, prefer navigate(-1)
    if (window.history.state && window.history.state.idx > 0) {
      e.preventDefault();
      navigate(-1);
    }
  };

  const defaultClasses =
    'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors back-to-list-link';

  return (
    <Link
      to={to}
      onClick={handleClick}
      data-back-link="true"
      className={className || defaultClasses}
      state={{ isBackNavigation: true }}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{children}</span>
    </Link>
  );
};

export default BackLink;
