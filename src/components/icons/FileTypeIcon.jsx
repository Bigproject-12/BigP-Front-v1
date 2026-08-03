import Icon from './Icon';

const EXT_KIND = { java: 'java', py: 'python', c: 'c', h: 'c', json: 'json' };

function kindOf(name) {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? null : EXT_KIND[name.slice(dot + 1).toLowerCase()] ?? null;
}

function JavaGlyph({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M9 4.2c-1 1.1-1 2 0 3.1M12 3.6c-1 1.1-1 2 0 3.1M15 4.2c-1 1.1-1 2 0 3.1" fill="none" stroke="#8a5a1e" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6 10h11v4.2A4.3 4.3 0 0 1 12.7 18.5h-2.4A4.3 4.3 0 0 1 6 14.2Z" fill="#f89820" />
      <path d="M17.5 11.2h1.3a2.15 2.15 0 0 1 0 4.3h-1.3" fill="none" stroke="#f89820" strokeWidth="1.5" />
      <ellipse cx="11.5" cy="20" rx="5" ry="1.1" fill="#f89820" opacity="0.55" />
    </svg>
  );
}

function PythonGlyph({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2.4c-3 0-4.3 1-4.3 2.9v2h4.4v.6H5.7S3 7.6 3 11.9c0 4.3 2.4 4.1 2.4 4.1h1.4v-2.2c0-2.7 2.3-2.6 2.3-2.6h4.9s2.2 0 2.2-2.2V5.3c0-2.1-1.9-2.9-4.2-2.9Zm-2.4 1.7a.85.85 0 1 1 0 1.7.85.85 0 0 1 0-1.7Z" fill="#3776AB" />
      <path d="M12 21.6c3 0 4.3-1 4.3-2.9v-2h-4.4v-.6h6.4s2.7.2 2.7-4.1c0-4.3-2.4-4.1-2.4-4.1h-1.4v2.2c0 2.7-2.3 2.6-2.3 2.6H10s-2.2 0-2.2 2.2v3.8c0 2.1 1.9 2.9 4.2 2.9Zm2.4-1.7a.85.85 0 1 1 0-1.7.85.85 0 0 1 0 1.7Z" fill="#FFD43B" />
    </svg>
  );
}

function CGlyph({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#004482" />
      <text x="12" y="16.3" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Consolas, monospace">C</text>
    </svg>
  );
}

function JsonGlyph({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#5b6270" />
      <text x="12" y="15.8" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#fff" fontFamily="Consolas, monospace">{'{ }'}</text>
    </svg>
  );
}

const GLYPHS = { java: JavaGlyph, python: PythonGlyph, c: CGlyph, json: JsonGlyph };

// 파일명 확장자별로 브랜드 아이콘을 보여주고, 매칭되는 게 없으면 기존 범용 파일 아이콘을 그대로 쓴다.
export default function FileTypeIcon({ name, size = 14, className }) {
  const Glyph = GLYPHS[kindOf(name)];
  if (!Glyph) return <Icon name="file" size={size} className={className} />;
  return <Glyph size={size} className={className} />;
}
