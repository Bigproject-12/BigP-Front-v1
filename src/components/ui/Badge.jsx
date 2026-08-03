import './ui.css';

export default function Badge({ variant = 'neutral', children, className = '', style }) {
  return <span className={`ui-badge ui-badge--${variant} ${className}`} style={style}>{children}</span>;
}
