import { renderAdmin } from './admin.js';
import {
  MOBILE_RE, ensureSchema, getByMobile, listUsers, mobileExists, createUser, setGold, deleteUser, reseed, valueToman,
} from './db.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
const redirect = (to) => new Response(null, { status: 303, headers: { Location: to } });
const html = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all(
    [a, b].map(async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(String(s)))))
  );
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

async function adminAuthorized(request, env) {
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Basic ')) return false;
  let decoded;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(h.slice(6)), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  const [u, p] = await Promise.all([safeEqual(decoded.slice(0, i), 'admin'), safeEqual(decoded.slice(i + 1), env.ADMIN_PASSWORD)]);
  return u && p;
}

const toEnglishDigits = (s) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/٫/g, '.')
    .trim();

function parseGrams(raw) {
  const s = toEnglishDigits(raw);
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const GRAMS_ERR = 'موجودی باید عددی بزرگ‌تر یا مساوی صفر باشد.';

async function handle(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;
  const method = request.method;
  const price = Number(env.GOLD_PRICE_PER_GRAM_TOMAN);

  if (pathname === '/healthz') return json({ ok: true });

  if (!env.MELLIGOLD_API_KEY || !env.ADMIN_PASSWORD || !Number.isFinite(price) || price <= 0) {
    throw new Error('Missing env: MELLIGOLD_API_KEY / ADMIN_PASSWORD / GOLD_PRICE_PER_GRAM_TOMAN');
  }
  await ensureSchema(env.DB);

  // ---- API ----
  const m = pathname.match(/^\/api\/v1\/users\/by-mobile\/([^/]+)$/);
  if (m && method === 'GET') {
    const key = request.headers.get('X-API-Key');
    if (!key || !(await safeEqual(key, env.MELLIGOLD_API_KEY))) return json({ error: 'unauthorized' }, 401);
    const mobile = decodeURIComponent(m[1]);
    if (!MOBILE_RE.test(mobile)) return json({ error: 'invalid_mobile' }, 400);
    const row = await getByMobile(env.DB, mobile);
    if (!row) return json({ error: 'user_not_found' }, 404);
    return json({
      user: { id: row.id, fullName: row.fullName, mobile: row.mobile },
      gold: {
        grams: Math.round(row.grams * 1000) / 1000,
        pricePerGramToman: price,
        valueToman: valueToman(row.grams, price),
        updatedAt: row.updatedAt,
      },
    });
  }
  if (pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);

  // ---- Admin ----
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!(await adminAuthorized(request, env))) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="melligold-admin", charset="UTF-8"' },
      });
    }
    const show = async (errors = [], form = {}, status = 200) =>
      html(renderAdmin({ users: await listUsers(env.DB), price, valueToman, errors, form }), status);

    if (pathname === '/admin' && method === 'GET') return show();

    if (method === 'POST') {
      const body = await request.formData();
      if (pathname === '/admin/users') {
        const fullName = String(body.get('fullName') || '').trim();
        const mobile = toEnglishDigits(body.get('mobile'));
        const grams = parseGrams(body.get('goldGrams'));
        const errors = [];
        if (!fullName) errors.push('نام نباید خالی باشد.');
        if (!MOBILE_RE.test(mobile)) errors.push('موبایل باید به فرم ۰۹XXXXXXXXX باشد.');
        else if (await mobileExists(env.DB, mobile)) errors.push('این موبایل قبلاً ثبت شده است.');
        if (grams === null) errors.push(GRAMS_ERR);
        if (errors.length) return show(errors, { fullName, mobile, goldGrams: body.get('goldGrams') }, 400);
        await createUser(env.DB, fullName, mobile, grams);
        return redirect('/admin');
      }
      if (pathname === '/admin/seed') {
        await reseed(env.DB);
        return redirect('/admin');
      }
      const g = pathname.match(/^\/admin\/users\/(\d+)\/(gold|delete)$/);
      if (g) {
        const id = Number(g[1]);
        if (g[2] === 'delete') {
          await deleteUser(env.DB, id);
          return redirect('/admin');
        }
        const grams = parseGrams(body.get('goldGrams'));
        if (grams === null) return show([GRAMS_ERR], {}, 400);
        if (!(await setGold(env.DB, id, grams))) return show(['کاربر پیدا نشد.'], {}, 404);
        return redirect('/admin');
      }
    }
  }

  return new Response('Not found', { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (err) {
      console.error(err);
      if (new URL(request.url).pathname.startsWith('/api/')) return json({ error: 'internal_error' }, 500);
      return new Response('خطای داخلی', { status: 500 });
    }
  },
};
