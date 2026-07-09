import { useEffect } from 'react';
import Icon from '../icons/Icon';
import Button from './Button';
import './ui.css';

export default function Modal({ title, onClose, children, actions }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div className="ui-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="ui-modal__header">
          <h3 className="text-heading-md">{title}</h3>
          <Button variant="icon" onClick={onClose} aria-label="닫기">
            <Icon name="close" size={16} />
          </Button>
        </div>
        {children}
        {actions && <div className="ui-modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
