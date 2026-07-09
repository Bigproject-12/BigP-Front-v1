import './ui.css';

export default function Select({ className = '', children, ...rest }) {
  return (
    <select className={`ui-select ${className}`} {...rest}>
      {children}
    </select>
  );
}
