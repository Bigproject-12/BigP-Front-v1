import { useRouter } from '../router/RouterContext';
import { useFavorites } from '../context/FavoritesContext';
import { formatDate, languageColor } from '../lib/format';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/icons/Icon';
import './RepoListPage.css';

export default function MySpacePage() {
  const { navigate } = useRouter();
  const { favorites } = useFavorites();

  return (
    <>
      <div className="gr-page__header">
        <div className="gr-page__header-text">
          <h1 className="text-display-md">My Space</h1>
          <span className="text-body-sm">즐겨찾기한 레포지토리 {favorites.length}개</span>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div
          className="ui-empty"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0' }}
        >
          <Icon name="star" size={28} />
          <span style={{ color: 'var(--text-muted)' }}>즐겨찾기한 레포지토리가 없습니다.</span>
          <Button variant="primary" onClick={() => navigate('?page=repolist')}>
            Repository 목록으로 가기
          </Button>
        </div>
      ) : (
        <div className="repo-grid">
          {favorites.map((repo) => (
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
                <Badge variant={repo.private ? 'neutral' : 'info'}>
                  {repo.private ? '비공개' : '공개'}
                </Badge>
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
