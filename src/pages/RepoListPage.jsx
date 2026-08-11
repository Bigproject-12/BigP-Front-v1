import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { useRepos } from '../context/RepoContext';
import { api } from '../lib/api';
import { formatDate, languageColor } from '../lib/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import Button from '../components/ui/Button';
import './RepoListPage.css';

const UNASSIGNED_ORG = '미분류';

// '최근 분석 실행됨' 판단 기준: 기간(예: 7일 이내)이 아니라, 로그인한 사용자 기준으로
// 가장 최근 분석 N건(RECENT_ANALYSIS_COUNT)에 포함된 레포지토리인지로 판단한다.
// /api/dashboard(회사 전체 집계, 접근 권한 체크 없이 company_id만으로 노출됨)는 다른 팀/조직의
// 레포·분석 정보까지 보일 수 있어 쓰지 않고, 로그인 사용자 소유 데이터만 돌려주는
// /api/my-space/overview(recentAnalyses)를 재사용한다.
//
// RECENT_ANALYSIS_WINDOW_DAYS: 이 API는 My Space 페이지 전체(추이 차트, 위험 레포 랭킹,
// 이전 기간 대비 비교 등)를 위한 무거운 집계 엔드포인트라, from~to 폭이 넓을수록
// (특히 일별 추이 계산 + "이전 기간" 비교가 그 폭만큼 두 배로 돌아서) 응답이 느려진다.
// 배지 용도로는 "최근 N건"만 있으면 되므로 폭을 짧게 잡아 불필요한 연산을 줄인다.
// 프로젝트 호흡이 더 길어지면(예: 몇 주씩 분석이 뜸해지면) 이 값을 늘려야 배지가 계속 뜬다.
const RECENT_ANALYSIS_WINDOW_DAYS = 45;
const RECENT_ANALYSIS_COUNT = 5;

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function RepoCard({ repo, isFavorite, onToggleFavorite, onClick, recentlyAnalyzed }) {
  return (
    <Card className="repo-card" onClick={onClick}>
      <div className="repo-card__head">
        <div className="repo-card__title">
          <Icon name="repo" size={16} />
          <span className="repo-card__name">{repo.name}</span>
        </div>
        <div className="repo-card__actions">
          <button
            type="button"
            className={`repo-card__fav ${isFavorite ? 'repo-card__fav--active' : ''}`}
            onClick={onToggleFavorite}
            aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
          >
            <Icon name="star" size={16} filled={isFavorite} />
          </button>
          <Badge variant={repo.private ? 'neutral' : 'info'}>
            {repo.private ? '비공개' : '공개'}
          </Badge>
        </div>
      </div>
      <p className="repo-card__desc text-body-sm">{repo.description}</p>
      <div className="repo-card__meta">
        <span className="repo-card__lang text-caption-md">
          <span
            className="repo-card__lang-dot"
            style={{ background: languageColor(repo.language) }}
          />
          {repo.language}
        </span>
        <span className="text-caption-md">업데이트 {formatDate(repo.updatedAt)}</span>
        {recentlyAnalyzed && (
          <Badge variant="success" title="내가 최근 실행한 분석 목록에 포함된 레포지토리">
            최근 분석됨
          </Badge>
        )}
      </div>
    </Card>
  );
}

export default function RepoListPage() {
  const { navigate } = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { repos, reposLoading, refreshRepos } = useRepos();
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [language, setLanguage] = useState('all');
  const [organization, setOrganization] = useState('all');
  const [sort, setSort] = useState('recent');
  const [collapsedOrgs, setCollapsedOrgs] = useState(new Set());
  const [recentlyAnalyzedIds, setRecentlyAnalyzedIds] = useState(new Set());

  useEffect(() => {
    const to = toISODate(new Date());
    const from = toISODate(new Date(Date.now() - RECENT_ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000));
    api.get(`/api/my-space/overview?from=${from}&to=${to}`)
      .then((d) => {
        // 실패(FAILED)한 분석은 결과가 없어 확인할 게 없으므로 배지 대상에서 제외한다.
        const ids = new Set(
          (d.recentAnalyses ?? [])
            .slice(0, RECENT_ANALYSIS_COUNT)
            .filter((a) => a.status !== 'FAILED')
            .map((a) => a.repoId)
        );
        setRecentlyAnalyzedIds(ids);
      })
      .catch(() => setRecentlyAnalyzedIds(new Set()));
  }, []);

  // GitHub 연동 여부는 localStorage(개인 토큰)가 아니라
  // 백엔드(/api/repos, DB)에서 실제로 데이터를 받았는지로 판단한다.
  // 로딩 중이 아닌데 repos가 비어 있으면 "연동 필요/데이터 없음" 상태로 취급.
  const hasNoData = !reposLoading && repos.length === 0;

  const languages = useMemo(
    () => [...new Set(repos.map((r) => r.language).filter(Boolean))],
    [repos]
  );

  const organizations = useMemo(
    () => [...new Set(repos.map((r) => r.organization).filter(Boolean))],
    [repos]
  );

  const visible = useMemo(() => {
    let list = repos.filter((r) => {
      const matchesQuery =
        !query.trim() ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(query.toLowerCase());
      const matchesVisibility =
        visibility === 'all' || (visibility === 'private' ? r.private : !r.private);
      const matchesLanguage = language === 'all' || r.language === language;
      const matchesOrganization = organization === 'all' || r.organization === organization;
      return matchesQuery && matchesVisibility && matchesLanguage && matchesOrganization;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return list;
  }, [repos, query, visibility, language, organization, sort]);

  const groupedByOrganization = useMemo(() => {
    const groups = new Map();
    for (const repo of visible) {
      const org = repo.organization || UNASSIGNED_ORG;
      if (!groups.has(org)) groups.set(org, []);
      groups.get(org).push(repo);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);

  const toggleOrgCollapsed = (org) => {
    setCollapsedOrgs((prev) => {
      const next = new Set(prev);
      if (next.has(org)) next.delete(org);
      else next.add(org);
      return next;
    });
  };

  const handleToggleFavorite = (e, repo) => {
    e.stopPropagation();
    toggleFavorite(repo);
  };

  const goToMyPage = () => {
    if (navigate) {
      navigate('?page=mypage#github-section');
    } else {
      window.location.hash = '#/mypage#github-section';
    }
  };

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">Repository 목록</h1>
          <span className="text-body-sm">
            {hasNoData
              ? 'GitHub 연동이 필요합니다.'
              : `연동된 GitHub 저장소 ${repos.length}개`}
          </span>
        </div>
        {/* 새로고침은 항상 가능해야 함 (연동 여부와 무관하게 DB 재조회 시도) */}
        <Button variant="secondary" onClick={refreshRepos} disabled={reposLoading}>
          <Icon name="refresh" size={16} />
        </Button>
      </div>

      <div className="repo-toolbar">
        <div className="repo-toolbar__search">
          <Input
            placeholder="Repository명 또는 설명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
            disabled={hasNoData}
          />
        </div>
        <Select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          disabled={hasNoData}
        >
          <option value="all">전체 유형</option>
          <option value="public">공개</option>
          <option value="private">비공개</option>
        </Select>
        <Select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={hasNoData}
        >
          <option value="all">전체 언어</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </Select>
        <Select
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          disabled={hasNoData}
        >
          <option value="all">전체 조직</option>
          {organizations.map((org) => (
            <option key={org} value={org}>
              {org}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} disabled={hasNoData}>
          <option value="recent">최근 업데이트순</option>
          <option value="name">이름순</option>
        </Select>
      </div>

      {reposLoading ? (
        <div
          className="ui-empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 0',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            Repository 목록을 불러오는 중입니다.
          </span>
        </div>
      ) : hasNoData ? (
        <div
          className="ui-empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 0',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            불러올 수 있는 저장소가 없습니다. GitHub 연동을 확인해 주세요.
          </span>
          <Button variant="primary" onClick={goToMyPage}>
            GitHub 연동하러 가기
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div
          className="ui-empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '60px 0',
          }}
        >
          <Icon name="repo" size={28} />
          <span style={{ color: 'var(--text-muted)' }}>조건에 맞는 Repository가 없습니다.</span>
        </div>
      ) : (
        <div className="repo-groups">
          {groupedByOrganization.map(([org, reposInGroup]) => {
            const isOpen = !collapsedOrgs.has(org);
            return (
              <section key={org} className="repo-group">
                <button
                  type="button"
                  className="repo-group__header"
                  onClick={() => toggleOrgCollapsed(org)}
                  aria-expanded={isOpen}
                >
                  <Icon
                    name="chevronDown"
                    size={16}
                    className={`repo-group__chevron ${isOpen ? 'repo-group__chevron--open' : ''}`}
                  />
                  <h2 className="repo-group__title text-heading-md">{org}</h2>
                  <span className="text-caption-md repo-group__count">{reposInGroup.length}개</span>
                </button>
                {isOpen && (
                  <div className="repo-grid">
                    {reposInGroup.map((repo) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        isFavorite={isFavorite(repo.id)}
                        onToggleFavorite={(e) => handleToggleFavorite(e, repo)}
                        onClick={() => navigate(`?page=repo-detail&repoId=${repo.id}`)}
                        recentlyAnalyzed={recentlyAnalyzedIds.has(repo.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}