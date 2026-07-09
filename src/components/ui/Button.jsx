import './ui.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  block = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ui-btn',
    variant === 'icon' ? 'ui-btn--icon' : `ui-btn--${variant}`,
    variant !== 'icon' ? `ui-btn--${size}` : '',
    block ? 'ui-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
