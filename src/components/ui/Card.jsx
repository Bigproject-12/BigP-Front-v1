import { forwardRef } from 'react';
import './ui.css';

const Card = forwardRef(function Card({ flat = false, className = '', children, ...rest }, ref) {
  return (
    <div ref={ref} className={`ui-card ${flat ? 'ui-card--flat' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
});

export default Card;
