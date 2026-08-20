import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../../router/RouterContext';
import { useRepos } from '../../context/RepoContext';
import { useFavorites } from '../../context/FavoritesContext';
import Icon from '../icons/Icon';
import './RepoSwitcher.css';

// 이 개수를 넘으면 드롭다운 안에 검색창을 띄운다.
const SEARCH_THRESHOLD = 8;
// organization이 비어 있는 레포를 묶을 이름 (Repository 목록 페이지와 동일)
const UNASSIGNED_ORG = '미분류';

/**
 * 히스토리/Push 화면 상단의 레포 이름을 드롭다운 셀렉터로 만든다.
 *
 * 기존에는 다른 레포의 히스토리를 보려면 반드시 Repository 목록 페이지를 왕복해야 했다.
 * RepoContext에 이미 전체 레포 목록이 있으므로 추가 API 호출 없이 그 자리에서 전환한다.
 *
 * 겉모습은 기존과 동일하게 유지한다. h1(text-display-md)을 그대로 쓰고,
 * 내부 button은 배경/테두리/패딩 없이 font와 color만 상속받아 시각적 변화가 없도록 했다.
 *
 * @param {object|null} repo        현재 레포 (아직 못 불러왔으면 null)
 * @param {string}      targetPage  선택 시 이동할 페이지 키 ('repo-detail' | 'push-tab')
 */
export default function RepoSwitcher({ repo, targetPage = 'repo-detail' }) {
  const { navigate } = useRouter();
  const { repos } = useRepos();
  const { isFavorite } = useFavorites();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  // organization을 최상위 기준으로 묶는다. Repository 목록 페이지와 같은 분류 체계라
  // 두 화면을 오갈 때 같은 순서 감각을 유지할 수 있다.
  // 그룹 안에서는 즐겨찾기를 위로 올리고, 나머지는 이름순으로 정렬한다.
  const groups = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const matched = keyword
      ? repos.filter(
          (r) =>
            r.name.toLowerCase().includes(keyword) ||
            (r.organization ?? '').toLowerCase().includes(keyword)
        )
      : repos;

    const byOrg = new Map();
    for (const repo of matched) {
      const org = repo.organization || UNASSIGNED_ORG;
      if (!byOrg.has(org)) byOrg.set(org, []);
      byOrg.get(org).push(repo);
    }
    for (const list of byOrg.values()) {
      list.sort((a, b) => {
        const favDiff = Number(isFavorite(b.id)) - Number(isFavorite(a.id));
        return favDiff !== 0 ? favDiff : a.name.localeCompare(b.name);
      });
    }
    // 현재 보고 있는 레포가 속한 org를 맨 위로 올려, 열자마자 지금 위치가 보이게 한다.
    const currentOrg = repo?.organization || null;
    return [...byOrg.entries()].sort(([a], [b]) => {
      if (a === currentOrg) return -1;
      if (b === currentOrg) return 1;
      return a.localeCompare(b);
    });
  }, [repos, query, isFavorite, repo]);

  const totalMatched = groups.reduce((sum, [, list]) => sum + list.length, 0);

  // 열릴 때마다 검색어를 비운다. 이전 검색이 남아 목록이 비어 보이는 걸 막는다.
  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    // 검색창이 있을 때만 포커스를 준다.
    const timerId = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(timerId);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectRepo = (id) => {
    setOpen(false);
    if (repo && repo.id === id) return; // 같은 레포면 이동하지 않는다.
    // p(페이지) 파라미터를 일부러 빼고 이동한다. 다른 레포인데 이전 페이지 번호가 남으면
    // 항목이 그만큼 없을 때 빈 화면이 보이기 때문.
    navigate(`?page=${targetPage}&repoId=${id}`);
  };

  const renderItem = (r) => (
    <button
      key={r.id}
      type="button"
      role="option"
      aria-selected={repo?.id === r.id}
      className={`repo-switcher__item ${repo?.id === r.id ? 'repo-switcher__item--active' : ''}`}
      onClick={() => selectRepo(r.id)}
    >
      <Icon name="repo" size={14} />
      <span className="repo-switcher__item-name">{r.name}</span>
      {isFavorite(r.id) && (
        <Icon name="star" size={12} filled className="repo-switcher__item-star" />
      )}
    </button>
  );

  return (
    <div className="repo-switcher" ref={wrapRef}>
      <h1 className="text-display-md">
        <button
          type="button"
          className="repo-switcher__trigger"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title="다른 Repository로 전환"
        >
          <span>{repo ? repo.name : '불러오는 중…'}</span>
          <Icon
            name="chevronDown"
            size={18}
            className={`repo-switcher__chevron ${open ? 'repo-switcher__chevron--open' : ''}`}
          />
        </button>
      </h1>

      {open && (
        <div className="repo-switcher__panel" role="listbox">
          {repos.length > SEARCH_THRESHOLD && (
            <div className="repo-switcher__search">
              <Icon name="search" size={14} />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Repository 또는 조직 검색"
                aria-label="Repository 또는 조직 검색"
              />
            </div>
          )}

          <div className="repo-switcher__list">
            {totalMatched === 0 ? (
              <div className="repo-switcher__empty text-caption-md">
                {repos.length === 0
                  ? '연동된 Repository가 없습니다.'
                  : '검색 결과가 없습니다.'}
              </div>
            ) : (
              groups.map(([org, list]) => (
                <div key={org} className="repo-switcher__group">
                  <div className="repo-switcher__label">
                    <Icon name="organization" size={15} />
                    <span>{org}</span>
                  </div>
                  {list.map(renderItem)}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
