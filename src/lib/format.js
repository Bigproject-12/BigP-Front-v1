export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * 좁은 표 칸에서 줄바꿈되지 않도록 일시를 짧게 표기한다.
 *
 *   오늘    → 오전 10:05   (날짜는 생략, 시간만)
 *   어제    → 어제
 *   2~6일 전 → 3일 전
 *   그 이상  → 08. 04.     (해가 다르면 2025. 12. 31.)
 *
 * 정확한 일시가 필요한 경우를 위해, 호출부에서 formatDateTime()을 title 속성에 넣어
 * 마우스를 올리면 전체 값이 보이도록 한다. 표시만 줄이고 정보는 잃지 않기 위함.
 */
export function formatDateTimeCompact(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';

  const now = new Date();
  // 단순 24시간 차가 아니라 '달력상 며칠 전'으로 계산한다.
  // 그래야 어제 23시에 한 분석을 오늘 0시 30분에 봐도 '어제'로 나온다.
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / MS_PER_DAY);

  // dayDiff < 0 은 서버/클라이언트 시계 차이로 미래 시각이 온 경우. 오늘과 동일하게 처리.
  if (dayDiff <= 0) {
    // hour12:false 로 24시간제 고정. '오전/오후'를 빼서 5글자로 줄이고,
    // 런타임(브라우저/Node)마다 ko-KR의 오전·오후 표기가 'AM/PM'으로 달라지는 것도 피한다.
    return d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  if (dayDiff === 1) return '어제';
  if (dayDiff < 7) return `${dayDiff}일 전`;
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  }
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const LANGUAGE_COLORS = {
  Python: '#3987e5',
  TypeScript: '#3987e5',
  JavaScript: '#eda100',
  Java: '#e34948',
  Go: '#1baf7a',
  HCL: '#9085e9',
  Ruby: '#e34948',
};

export function languageColor(lang) {
  return LANGUAGE_COLORS[lang] || 'var(--ps-primary)';
}
