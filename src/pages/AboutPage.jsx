import { useEffect, useRef, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import logoDark from '../assets/icons/logo2-login-dark.png';
import logoLight from '../assets/icons/logo2-light.png';
import './AboutPage.css';

const shotModules = import.meta.glob('../assets/about/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

function findShot(key, theme) {
  const entry = Object.entries(shotModules).find(([path]) => path.includes(`/${key}-${theme}.`));
  if (entry) return entry[1];
  const fallback = Object.entries(shotModules).find(([path]) => path.includes(`/${key}-`));
  return fallback ? fallback[1] : null;
}

const FEATURES = [
  {
    key: 'home',
    icon: 'home',
    title: 'HOME 대시보드',
    desc: '조직 전체 코드 품질을 한 화면에서 파악할 수 있는 시작 화면이에요.',
    points: ['품질 점수 추이 그래프', '이슈 유형 분포 확인', '최근 분석 결과 · 최근 PR 한눈에 보기'],
    shot: 'HOME 대시보드 화면 캡처',
  },
  {
    key: 'myspace',
    icon: 'profile',
    title: 'My Space',
    desc: '내 프로젝트 구조를 트리로 탐색하며 어디부터 손대야 할지 바로 알 수 있어요.',
    points: ['프로젝트 구조 트리 탐색', '위험 Repository / 파일 TOP5', '우선 해결해야 할 이슈 확인'],
    shot: 'My Space 프로젝트 트리 화면 캡처',
  },
  {
    key: 'analyze',
    icon: 'code',
    title: '코드 분석',
    desc: 'Repository·브랜치·파일을 고르거나 코드를 직접 붙여넣으면 AI 멀티에이전트가 바로 분석을 시작해요.',
    points: ['Repository / 브랜치 / 파일 선택 또는 직접 입력', '비효율 알고리즘 · 메모리 누수 탐지', '보안 취약점 탐지'],
    shot: '코드 분석 화면 캡처',
  },
  {
    key: 'ai-detect',
    icon: 'spark',
    title: '취약점 분류 · AI 코드 판별',
    desc: '보안 취약점과 비효율적인 코드들을 CWE / OWASP 기준으로 분류하고, AI가 생성한 코드인지 여부까지 판별해요.',
    points: ['CWE / OWASP 취약점 유형 분류', 'AI 생성 코드 여부 판별', '원본 프롬프트 재구성', ],
    shot: '분석 결과 상세 화면 캡처',
  },
  {
    icon: 'pullrequest',
    title: '자동 Push 및 PR 생성',
    desc: '찾아낸 문제를 리포트로 끝내지 않고, 실제 반영까지 이어줘요. 카드에 마우스를 올리면 단계별 화면을 볼 수 있어요.',
    points: ['개선 코드 선택 후 GitHub Push', 'Pull Request 원클릭 생성'],
    steps: [
      { key: 'pr-select', shot: '① 개선 코드 선택 화면 캡처' },
      { key: 'pr-push', shot: '② GitHub Push 진행 화면 캡처' },
      { key: 'pr-created', shot: '③ PR 생성 완료 화면 캡처' },
    ],
  },
  {
    key: 'history',
    icon: 'score',
    title: '히스토리 확인',
    desc: '저장소별 분석 이력과 개인 리포트로 품질이 어떻게 변해왔는지 확인할 수 있어요.',
    points: ['프로젝트 히스토리 확인', '개인 리포트 확인', '품질 변화 추이 추적'],
    shot: '히스토리 · 리포트 화면 캡처',
  },
];

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

function ShotFrame({ shotKey, label, theme, className = '' }) {
  const shotSrc = findShot(shotKey, theme);
  return (
    <div className={`about-shot-frame ${className}`}>
      <div className="about-shot-frame__bar">
        <span />
        <span />
        <span />
      </div>
      {shotSrc ? (
        <img className="about-shot-frame__image" src={shotSrc} alt={label} />
      ) : (
        <div className="about-shot-frame__placeholder">
          <Icon name="upload" size={26} />
          <span>{label}</span>
          <span className="about-shot-frame__hint">
            src/assets/about/{shotKey}-dark.png · {shotKey}-light.png
          </span>
        </div>
      )}
    </div>
  );
}

function ShotStack({ steps, theme }) {
  return (
    <div className="about-shot-stack">
      {steps.map((step) => (
        <ShotFrame
          key={step.key}
          shotKey={step.key}
          label={step.shot}
          theme={theme}
          className="about-shot-stack__item"
        />
      ))}
    </div>
  );
}

function FeatureRow({ index, feature }) {
  const [ref, visible] = useReveal();
  const { theme } = useTheme();
  const reversed = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`about-feature-row ${reversed ? 'about-feature-row--reversed' : ''} ${
        visible ? 'about-feature-row--visible' : ''
      }`}
    >
      <div className="about-feature-row__media">
        <span className="about-feature-row__glow about-feature-row__glow--a" aria-hidden="true" />
        <span className="about-feature-row__glow about-feature-row__glow--b" aria-hidden="true" />
        <div
          className={`about-feature-row__number ${feature.steps ? 'about-feature-row__number--stack' : ''}`}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        {feature.steps ? (
          <ShotStack steps={feature.steps} theme={theme} />
        ) : (
          <ShotFrame shotKey={feature.key} label={feature.shot} theme={theme} />
        )}
      </div>

      <div className="about-feature-row__body">
        <h3 className="about-feature-row__title">{feature.title}</h3>
        <span className="about-feature-row__rule" aria-hidden="true" />
        <p className="about-feature-row__desc">{feature.desc}</p>

        <div className="about-feature-row__eyebrow">
          <Icon name="spark" size={16} />
          <span>KEY FEATURES</span>
        </div>
        <ul className="about-feature-row__points">
          {feature.points.map((p) => (
            <li key={p}>
              <span className="about-feature-row__check">
                <Icon name="check" size={13} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const { navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const logoIcon = theme === 'dark' ? logoDark : logoLight;

  return (
    <div className="about-shell">
      <header className="about-header">
        <button
          type="button"
          className="ui-btn ui-btn--ghost about-header__back"
          onClick={() => navigate('?page=login')}
        >
          <Icon name="chevronLeft" size={16} />
          로그인으로 돌아가기
        </button>

        <div className="about-header__brand">
          <img src={logoIcon} alt="" className="about-header__brand-mark" />
          <span className="about-header__brand-text">GuardrAil</span>
        </div>

        <Button
          variant="icon"
          aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          onClick={toggleTheme}
        >
          <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
        </Button>
      </header>

      <section className="about-hero">
        <h1 className="about-hero__title">AI 기반 코드 품질 관리 플랫폼</h1>
        <p className="about-hero__desc">
          AI가 생성한 코드는 늘어나는데, 검증 없이 배포되는 코드도 함께 늘고 있어요.
          <br />
          GuardrAil은 코드 분석부터 취약점 탐지, 개선 코드 제안, GitHub Push/Pull Request 자동 생성까지 한 흐름으로 이어주는 통합 코드 품질 관리 플랫폼이에요.
        </p>
        <div className="about-hero__actions">
          <Button variant="primary" onClick={() => navigate('?page=login&tab=signup')}>
            회원가입
          </Button>
          <Button variant="secondary" onClick={() => navigate('?page=login')}>
            로그인
          </Button>
        </div>
        <div className="about-hero__scroll-hint">
          <span>SCROLL</span>
          <Icon name="chevronDown" size={16} />
        </div>
      </section>

      <section className="about-features">
        <div className="about-features__intro">
          <span className="about-features__eyebrow">PRODUCT FEATURES</span>
          <h2 className="about-features__title">주요 기능</h2>
        </div>
        <div className="about-features__list">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} index={i} feature={f} />
          ))}
        </div>
      </section>

      <footer className="about-footer">
        <span className="text-caption-md">© {new Date().getFullYear()} GuardrAil</span>
      </footer>
    </div>
  );
}
