const BASE = 'https://api.github.com';

export const GITHUB_TOKEN_KEY = 'bigp-github-token';
export const GITHUB_ORG_KEY = 'bigp-github-org';

function getToken() {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || '';
}

export function getOrg() {
  return localStorage.getItem(GITHUB_ORG_KEY) || '';
}

function headers() {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' }
    : { Accept: 'application/vnd.github+json' };
}

function mapRepo(r) {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? '',
    private: r.private,
    language: r.language ?? '기타',
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    stars: r.stargazers_count,
    forks: r.forks_count,
  };
}

export async function fetchRepoTree(fullName) {
  const res = await fetch(`${BASE}/repos/${fullName}/git/trees/HEAD?recursive=1`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  const data = await res.json();
  return (data.tree ?? []).filter((n) => n.type === 'blob').map((n) => n.path);
}

export async function fetchFileContent(fullName, path) {
  const res = await fetch(`${BASE}/repos/${fullName}/contents/${encodeURIComponent(path)}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  const data = await res.json();
  return atob(data.content.replace(/\n/g, ''));
}

export async function fetchRepo(id) {
  const res = await fetch(`${BASE}/repositories/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  return mapRepo(await res.json());
}

export async function fetchOrgRepos() {
  const res = await fetch(`${BASE}/orgs/${getOrg()}/repos?per_page=100&sort=updated`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`GitHub API 오류 (${res.status})`);
  const data = await res.json();
  return data.map(mapRepo);
}
