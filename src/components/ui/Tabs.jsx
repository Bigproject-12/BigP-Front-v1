import './ui.css';

export function Tabs({ items, active, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={active === item.key}
          aria-disabled={item.disabled || undefined}
          disabled={item.disabled}
          className={`ui-tabs__item ${active === item.key ? 'ui-tabs__item--active' : ''} ${item.disabled ? 'ui-tabs__item--disabled' : ''}`}
          onClick={() => !item.disabled && onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Segment({ items, active, onChange }) {
  return (
    <div className="ui-segment">
      {items.map((item) => (
        <button
          key={item.key}
          className={`ui-segment__item ${active === item.key ? 'ui-segment__item--active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
