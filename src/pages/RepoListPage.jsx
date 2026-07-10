import { useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { api } from '../lib/api';
import { formatDate, languageColor } from '../lib/format';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Icon from '../components/icons/Icon';
import './RepoListPage.css';

export default function RepoListPage() {
  const { navigate } = useRouter();
  const { toggleFavorite } = useFavorites();
  const [repos, setRepos] = useState([]);
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    api.get('/repos').then(setRepos).catch(() => setRepos([]));
  }, []);

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

  const handleToggleFavorite = async (e, repo) => {
    e.stopPropagation();
    const updated = await toggleFavorite(repo);
    setRepos((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">Repository 목록</h1>
          <span className="text-body-sm">연동된 GitHub 저장소 {repos.length}개</span>
        </div>
      </div>

      <div className="repo-toolbar">
        <div className="repo-toolbar__search">
          <Input
            placeholder="레포명 또는 설명 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Icon name="search" size={16} />}
          />
        </div>
        <Select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="all">전체 유형</option>
          <option value="public">공개</option>
          <option value="private">비공개</option>
        </Select>
        <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="all">전체 언어</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">최근 업데이트순</option>
          <option value="name">이름순</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="ui-empty">
          <Icon name="repo" size={28} />
          <span>조건에 맞는 레포지토리가 없습니다.</span>
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
                    className={`repo-card__fav ${repo.favorite ? 'repo-card__fav--active' : ''}`}
                    onClick={(e) => handleToggleFavorite(e, repo)}
                    aria-label={repo.favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  >
                    <Icon name="star" size={16} filled={repo.favorite} />
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
