import handler from '../server/dist/api.mjs';

export default function clidentApi(req, res) {
  const url = new URL(req.url || '/', 'https://localhost');
  const route = url.searchParams.get('__clident_route');
  if (route !== null) {
    url.searchParams.delete('__clident_route');
    req.url = `/api/${route}${url.search}`;
  }
  return handler(req, res);
}
