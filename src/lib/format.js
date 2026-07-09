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
