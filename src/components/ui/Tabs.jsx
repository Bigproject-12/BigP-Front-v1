import './ui.css';

export function Tabs({ items, active, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={active === item.key}
          className={`ui-tabs__item ${active === item.key ? 'ui-tabs__item--active' : ''}`}
          onClick={() => onChange(item.key)}
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
