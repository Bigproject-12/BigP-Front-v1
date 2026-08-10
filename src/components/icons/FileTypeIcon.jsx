import Icon from './Icon';
import javaIcon from '../../assets/icons/java.png';
import pythonIcon from '../../assets/icons/python.png';
import javascriptIcon from '../../assets/icons/javascript.png';
import reactIcon from '../../assets/icons/react.png';
import dockerIcon from '../../assets/icons/docker.png';
import gradleIcon from '../../assets/icons/gradle.png';
import envIcon from '../../assets/icons/env.png';
import viteIcon from '../../assets/icons/vite.png';
import jsonIcon from '../../assets/icons/json.png';
import cIcon from '../../assets/icons/C.png';
import cppIcon from '../../assets/icons/C++.png';
import csharpIcon from '../../assets/icons/csharp.png';
import htmlIcon from '../../assets/icons/html.png';
import cssIcon from '../../assets/icons/css.png';

const EXT_KIND = {
  java: 'java',
  py: 'python',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  cs: 'csharp',
  json: 'json',
  jsonl: 'json',
  js: 'javascript',
  jsx: 'react',
  docker: 'docker',
  gradle: 'gradle',
  env: 'env',
  css: 'css',
  vite: 'vite',
  html: 'html',
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
const ViteGlyph = ImageGlyph(viteIcon);
const JsonGlyph = ImageGlyph(jsonIcon);
const CGlyph = ImageGlyph(cIcon);
const CppGlyph = ImageGlyph(cppIcon);
const CSharpGlyph = ImageGlyph(csharpIcon);
const HtmlGlyph = ImageGlyph(htmlIcon);
const CssGlyph = ImageGlyph(cssIcon);

const GLYPHS = {
  java: JavaGlyph,
  python: PythonGlyph,
  javascript: JavaScriptGlyph,
  react: ReactGlyph,
  c: CGlyph,
  cpp: CppGlyph,
  csharp: CSharpGlyph,
  json: JsonGlyph,
  docker: DockerGlyph,
  gradle: GradleGlyph,
  env: EnvGlyph,
  css: CssGlyph,
  vite: ViteGlyph,
  html: HtmlGlyph,
};

// 파일명 확장자별로 브랜드 아이콘을 보여주고, 매칭되는 게 없으면 기존 범용 파일 아이콘을 그대로 쓴다.
export default function FileTypeIcon({ name, size = 14, className }) {
  const Glyph = GLYPHS[kindOf(name)];
  if (!Glyph) return <Icon name="file" size={size} className={className} />;
  return <Glyph size={size} className={className} />;
}
