import { useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { useRepos } from '../context/RepoContext';
import { formatDate, languageColor } from '../lib/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import Button from '../components/ui/Button';
import './RepoListPage.css';

const UNASSIGNED_ORG = '미분류';

function RepoCard({ repo, isFavorite, onToggleFavorite, onClick }) {
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
    // 검색어는 한 번만 소문자로 만들어 재사용한다(레포마다 toLowerCase를 반복하지 않도록).
    const keyword = query.trim().toLowerCase();
    let list = repos.filter((r) => {
      // 조직명도 검색 대상에 포함한다. 조직 셀렉트를 열지 않고도
      // 'bigproject'만 쳐서 해당 조직 레포를 추릴 수 있다.
      const matchesQuery =
        !keyword ||
        r.name.toLowerCase().includes(keyword) ||
        (r.description ?? '').toLowerCase().includes(keyword) ||
        (r.organization ?? '').toLowerCase().includes(keyword);
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
            placeholder="Repository명, 조직, 설명 검색"
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