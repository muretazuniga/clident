import type { IncomingMessage, ServerResponse } from 'node:http';

type ApiHandler = (request: Request) => Promise<Response>;
const limit = 1024 * 1024;
class RequestTooLarge extends Error {}
async function requestBody(req: IncomingMessage & { body?: unknown }): Promise<string | undefined> {
  if (['GET', 'HEAD'].includes(req.method || 'GET')) return undefined;
  if (Number(req.headers['content-length']) > limit) throw new RequestTooLarge();
  if (req.body !== undefined) {
    const body = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (Buffer.byteLength(body) > limit) throw new RequestTooLarge();
    return body;
  }
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > limit) throw new RequestTooLarge();
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createNodeHandler(getApi: () => ApiHandler, getOrigin = () => process.env.BETTER_AUTH_URL || 'http://localhost:4200') {
  return async (req: IncomingMessage & { body?: unknown }, res: ServerResponse) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      const body = await requestBody(req);
      const request = new Request(new URL(req.url || '/', getOrigin()), { method: req.method, headers, ...(body !== undefined ? { body } : {}) });
      const response = await getApi()(request);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) res.setHeader('Set-Cookie', cookies);
      res.end(req.method === 'HEAD' ? undefined : await response.text());
    } catch (error) {
      res.statusCode = error instanceof RequestTooLarge ? 413 : 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: error instanceof RequestTooLarge ? 'Solicitud demasiado grande.' : 'El servicio no está disponible. Revisa la configuración del servidor.' }));
    }
  };
}
