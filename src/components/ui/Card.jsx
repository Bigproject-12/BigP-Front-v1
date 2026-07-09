import './ui.css';

export default function Card({ flat = false, className = '', children, ...rest }) {
  return (
    <div className={`ui-card ${flat ? 'ui-card--flat' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}
