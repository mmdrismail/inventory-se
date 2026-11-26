import React from 'react';

export const Input = ({
  label,
  id,
  type = 'text',
  error,
  helperText,
  icon: Icon,
  required = false,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const inputId = id || props.name;
  const resolvedPlaceholder = props.placeholder !== undefined ? props.placeholder : type === 'number' ? '0' : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          id={inputId}
          type={type}
          required={required}
          className={`w-full rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 placeholder:text-slate-400 ${
            Icon ? 'pl-10' : ''
          } ${
            error
              ? 'border-red-400 dark:border-red-500 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
          } ${className}`}
          {...props}
          placeholder={resolvedPlaceholder}
        />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-400">{helperText}</span>}
    </div>
  );
};

export const Select = ({
  label,
  id,
  options = [],
  error,
  helperText,
  required = false,
  placeholder,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        className={`w-full rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 ${
          error
            ? 'border-red-400 dark:border-red-500 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
        } ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-500">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-400">{helperText}</span>}
    </div>
  );
};

export const Textarea = ({
  label,
  id,
  error,
  helperText,
  required = false,
  rows = 3,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const textareaId = id || props.name;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        className={`w-full rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 placeholder:text-slate-400 resize-y ${
          error
            ? 'border-red-400 dark:border-red-500 focus:border-red-500'
            : 'border-slate-200 dark:border-slate-800 focus:border-emerald-500'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-400">{helperText}</span>}
    </div>
  );
};
