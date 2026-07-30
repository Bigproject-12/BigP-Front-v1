import Icon from '../icons/Icon';
import './ui.css';

export default function StatCard({ icon, label, value, delta, deltaDirection = 'up' }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat__top">
        <span className={`ui-stat__icon ui-stat__icon--${icon}`}>
          <Icon name={icon} size={18} />
        </span>
        {delta && (
          <span className={`ui-stat__delta ui-stat__delta--${deltaDirection}`}>{delta}</span>
        )}
      </div>
      <div className="ui-stat__value">{value}</div>
      <div className="ui-stat__label">{label}</div>
    </div>
  );
}
