import Icon from '../icons/Icon';
import './ui.css';

/**
 * 대시보드 요약 카드.
 *
 * 배치: 위쪽에 아이콘과 지표 이름(label), 아래쪽에 값(value)과 증감(delta).
 * 지표 이름을 위로 올린 이유는 "무엇에 대한 숫자인지"를 먼저 읽고 값을 보게 하기 위함이다.
 *
 * deltaTone: 증감에 입힐 의미. 방향(증가/감소)과 좋고 나쁨은 지표마다 다르므로
 *   호출부에서 정해 넘긴다.
 *   'good'    → 초록  (예: 이슈가 줄었다)
 *   'bad'     → 빨강  (예: 이슈가 늘었다)
 *   'neutral' → 회색  (예: 분석 건수 변화 — 좋고 나쁨을 말할 수 없는 지표)
 */
export default function StatCard({ icon, label, value, delta, deltaTone = 'neutral' }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat__top">
        <span className={`ui-stat__icon ui-stat__icon--${icon}`}>
          <Icon name={icon} size={24} />
        </span>
        <span className="ui-stat__label">{label}</span>
      </div>
      <div className="ui-stat__bottom">
        <div className="ui-stat__value">{value}</div>
        {delta && (
          <span className={`ui-stat__delta ui-stat__delta--${deltaTone}`}>{delta}</span>
        )}
      </div>
    </div>
  );
}
