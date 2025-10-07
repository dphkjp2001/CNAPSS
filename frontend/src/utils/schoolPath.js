// Prefix api paths with /api/:school
export function schoolApiPath(school, path) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/api/${encodeURIComponent(school)}${clean}`;
}
