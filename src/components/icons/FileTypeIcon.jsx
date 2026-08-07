import Icon from './Icon';
import javaIcon from '../../assets/icons/java.png';
import pythonIcon from '../../assets/icons/python.png';
import javascriptIcon from '../../assets/icons/javascript.png';
import reactIcon from '../../assets/icons/react.png';
import dockerIcon from '../../assets/icons/docker.png';
import gradleIcon from '../../assets/icons/gradle.png';
import envIcon from '../../assets/icons/env.png';

const EXT_KIND = {
  java: 'java',
  py: 'python',
  c: 'c',
  h: 'c',
  json: 'json',
  js: 'javascript',
  jsx: 'react',
  docker: 'docker',
  gradle: 'gradle',
  env: 'env',
  css: 'css',
};

function kindOf(name) {
  if (name.toLowerCase() === 'dockerfile') return 'docker';
  const dot = name.lastIndexOf('.');
  return dot === -1 ? null : EXT_KIND[name.slice(dot + 1).toLowerCase()] ?? null;
}

function ImageGlyph(src) {
  return function Glyph({ size, className }) {
    return <img src={src} width={size} height={size} className={className} alt="" />;
  };
}

const JavaGlyph = ImageGlyph(javaIcon);
const PythonGlyph = ImageGlyph(pythonIcon);
const JavaScriptGlyph = ImageGlyph(javascriptIcon);
const ReactGlyph = ImageGlyph(reactIcon);
const DockerGlyph = ImageGlyph(dockerIcon);
const GradleGlyph = ImageGlyph(gradleIcon);
const EnvGlyph = ImageGlyph(envIcon);

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

function CssGlyph({ size, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="28" fontWeight="700" fill="#1572B6" fontFamily="Consolas, monospace">#</text>
    </svg>
  );
}

const GLYPHS = {
  java: JavaGlyph,
  python: PythonGlyph,
  javascript: JavaScriptGlyph,
  react: ReactGlyph,
  c: CGlyph,
  json: JsonGlyph,
  docker: DockerGlyph,
  gradle: GradleGlyph,
  env: EnvGlyph,
  css: CssGlyph,
};

// 파일명 확장자별로 브랜드 아이콘을 보여주고, 매칭되는 게 없으면 기존 범용 파일 아이콘을 그대로 쓴다.
export default function FileTypeIcon({ name, size = 14, className }) {
  const Glyph = GLYPHS[kindOf(name)];
  if (!Glyph) return <Icon name="file" size={size} className={className} />;
  return <Glyph size={size} className={className} />;
}
