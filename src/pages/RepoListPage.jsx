import { useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { useRepos } from '../context/RepoContext';
import { GITHUB_TOKEN_KEY, GITHUB_ORG_KEY } from '../lib/github';
import { formatDate, languageColor } from '../lib/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import Button from '../components/ui/Button';
import './RepoListPage.css';

export default function RepoListPage() {
  const { navigate } = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { repos, reposLoading, refreshRepos } = useRepos();
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState('recent');

  const isGithubLinked = Boolean(
    localStorage.getItem(GITHUB_TOKEN_KEY) && localStorage.getItem(GITHUB_ORG_KEY)
  );

  const languages = useMemo(() => [...new Set(repos.map((r) => r.language))], [repos]);

  const visible = useMemo(() => {
    let list = repos.filter((r) => {
      const matchesQuery =
        !query.trim() ||
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase());
      const matchesVisibility =
        visibility === 'all' || (visibility === 'private' ? r.private : !r.private);
      const matchesLanguage = language === 'all' || r.language === language;
      return matchesQuery && matchesVisibility && matchesLanguage;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    return list;
  }, [repos, query, visibility, language, sort]);

  const handleToggleFavorite = (e, repo) => {
    e.stopPropagation();
    toggleFavorite(repo);
  };

  const goToMyPage=()=>{
    if(navigate){
      navigate('?page=mypage#github-section');
    }else{
      window.location.hash='#/mypage#github-section';
    }
  };

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">Repository 목록</h1>
          <span className="text-body-sm">
            {isGithubLinked ?
            `연동된 GitHub 저장소 ${repos.length}개` : 'GitHub 연동이 필요합니다.'}
          </span>
        </div>
        {isGithubLinked && (
          <Button variant="ghost" onClick={refreshRepos} disabled={reposLoading}>
            <Icon name="refresh" size={16} />
            {reposLoading ? '불러오는 중…' : '새로고침'}
          </Button>
        )}
      </div>

      <div className="repo-toolbar">
        <div className="repo-toolbar__search">
          <Input
            placeholder="레포명 또는 설명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
            disabled={!isGithubLinked}
          />
        </div>
        <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}
          disabled={!isGithubLinked}>
          <option value="all">전체 유형</option>
          <option value="public">공개</option>
          <option value="private">비공개</option>
        </Select>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)}
          disabled={!isGithubLinked}>
          <option value="all">전체 언어</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)}
          disabled={!isGithubLinked}>
          <option value="recent">최근 업데이트순</option>
          <option value="name">이름순</option>
        </Select>
      </div>

      {reposLoading ? (
        <div className="ui-empty" style={{
          display:'flex', flexDirection:'column',
          alignItems:'center', gap:'16px', padding:'60px 0'
        }}>
          <span style={{color:'var(--text-muted)'}}>Repository 목록을 불러오는 중입니다.</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="ui-empty" style={{
          display:'flex', flexDirection:'column',
          alignItems:'center', gap:'16px', padding:'60px 0'
        }}>
          {!isGithubLinked ? (
          <>
          <span style={{color:'var(--text-muted)'}}>
          GitHub가 아직 연동되지 않았습니다. 저장소를 불러오려면 연동을 진행해 주세요.
          </span>
          <Button variant="primary" onClick={goToMyPage}>
          GitHub 연동하러 가기
          </Button>
          </>
          ):(
          <>
          <Icon name="repo" size={28} />
          <span style={{color:'var(--text-muted)'}}>조건에 맞는 레포지토리가 없습니다.</span>
          </>
          )}
        </div>
      ) : (
        <div className="repo-grid">
          {visible.map((repo) => (
            <Card
              key={repo.id}
              className="repo-card"
              onClick={() => navigate(`?page=repo-detail&repoId=${repo.id}`)}
            >
              <div className="repo-card__head">
                <div className="repo-card__title">
                  <Icon name="repo" size={16} />
                  <span className="repo-card__name">{repo.name}</span>
                </div>
                <div className="repo-card__actions">
                  <button
                    type="button"
                    className={`repo-card__fav ${isFavorite(repo.id) ? 'repo-card__fav--active' : ''}`}
                    onClick={(e) => handleToggleFavorite(e, repo)}
                    aria-label={isFavorite(repo.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    <Icon name="star" size={16} filled={isFavorite(repo.id)} />
                  </button>
                  <Badge variant={repo.private ? 'neutral' : 'info'}>{repo.private ? '비공개' : '공개'}</Badge>
                </div>
              </div>
              <p className="repo-card__desc text-body-sm">{repo.description}</p>
              <div className="repo-card__meta">
                <span className="repo-card__lang text-caption-md">
                  <span className="repo-card__lang-dot" style={{ background: languageColor(repo.language) }} />
                  {repo.language}
                </span>
                <span className="text-caption-md">업데이트 {formatDate(repo.updatedAt)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
