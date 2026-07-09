import { useId } from 'react';
import './ui.css';

export default function Input({
  label,
  error,
  hint,
  leftIcon,
  rightSlot,
  className = '',
  id,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`ui-field ${className}`}>
      {label && (
        <label className="ui-field__label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="ui-field__control">
        {leftIcon && <span className="ui-field__icon-left">{leftIcon}</span>}
        <input
          id={inputId}
          className={`ui-input ${leftIcon ? 'ui-input--with-left-icon' : ''} ${error ? 'ui-input--error' : ''}`}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        {rightSlot}
      </div>
      {error && <span className="ui-field__error">{error}</span>}
      {!error && hint && <span className="ui-field__hint">{hint}</span>}
    </div>
  );
}
