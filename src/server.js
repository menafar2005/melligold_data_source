'use strict';
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const { open, createQueries, valueToman, MOBILE_RE } = require('./db');
const { renderAdmin } = require('./admin');

const PORT = Number(process.env.PORT) || 4000;
const API_KEY = process.env.MELLIGOLD_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PRICE = Number(process.env.GOLD_PRICE_PER_GRAM_TOMAN);
const DB_PATH = process.env.DB_PATH || 'data/melligold.db';

const missing = [];
if (!API_KEY) missing.push('MELLIGOLD_API_KEY');
if (!ADMIN_PASSWORD) missing.push('ADMIN_PASSWORD');
if (!Number.isFinite(PRICE) || PRICE <= 0) missing.push('GOLD_PRICE_PER_GRAM_TOMAN');
if (missing.length) {
  console.error(`Missing/invalid env vars: ${missing.join(', ')} (see .env.example)`);
  process.exit(1);
}

const db = open(DB_PATH);
const q = createQueries(db);
const app = express();
app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false }));

const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// ---- API ----
function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');
  if (!key || !safeEqual(key, API_KEY)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/api/v1/users/by-mobile/:mobile', requireApiKey, (req, res) => {
  const { mobile } = req.params;
  if (!MOBILE_RE.test(mobile)) return res.status(400).json({ error: 'invalid_mobile' });
  const row = q.getByMobile(mobile);
  if (!row) return res.status(404).json({ error: 'user_not_found' });
  res.json({
    user: { id: row.id, fullName: row.fullName, mobile: row.mobile },
    gold: {
      grams: Math.round(row.grams * 1000) / 1000,
      pricePerGramToman: PRICE,
      valueToman: valueToman(row.grams, PRICE),
      updatedAt: row.updatedAt,
    },
  });
});

// ---- Admin ----
function requireAdmin(req, res, next) {
  const header = req.get('Authorization') || '';
  if (header.startsWith('Basic ')) {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const i = decoded.indexOf(':');
    if (i >= 0 && safeEqual(decoded.slice(0, i), 'admin') && safeEqual(decoded.slice(i + 1), ADMIN_PASSWORD)) {
      return next();
    }
  }
  res.set('WWW-Authenticate', 'Basic realm="melligold-admin", charset="UTF-8"');
  res.status(401).send('Unauthorized');
}

const toEnglishDigits = (s) =>
  String(s)
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٫]/g, '.')
    .trim();

function parseGrams(raw) {
  const s = toEnglishDigits(raw ?? '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const GRAMS_ERR = 'موجودی باید عددی بزرگ‌تر یا مساوی صفر باشد.';

function showAdmin(res, { errors = [], form = {}, status = 200 } = {}) {
  res.status(status).type('html').send(renderAdmin({ users: q.listUsers(), price: PRICE, valueToman, errors, form }));
}

app.get('/admin', requireAdmin, (_req, res) => showAdmin(res));

app.post('/admin/users', requireAdmin, (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const mobile = toEnglishDigits(req.body.mobile || '');
  const grams = parseGrams(req.body.goldGrams);
  const errors = [];
  if (!fullName) errors.push('نام نباید خالی باشد.');
  if (!MOBILE_RE.test(mobile)) errors.push('موبایل باید به فرم ۰۹XXXXXXXXX باشد.');
  else if (q.mobileExists(mobile)) errors.push('این موبایل قبلاً ثبت شده است.');
  if (grams === null) errors.push(GRAMS_ERR);
  if (errors.length) {
    return showAdmin(res, { errors, form: { fullName, mobile, goldGrams: req.body.goldGrams }, status: 400 });
  }
  q.createUser(fullName, mobile, grams);
  res.redirect(303, '/admin');
});

app.post('/admin/users/:id/gold', requireAdmin, (req, res) => {
  const grams = parseGrams(req.body.goldGrams);
  if (grams === null) return showAdmin(res, { errors: [GRAMS_ERR], status: 400 });
  if (!q.setGold(Number(req.params.id), grams)) {
    return showAdmin(res, { errors: ['کاربر پیدا نشد.'], status: 404 });
  }
  res.redirect(303, '/admin');
});

app.post('/admin/users/:id/delete', requireAdmin, (req, res) => {
  q.deleteUser(Number(req.params.id));
  res.redirect(303, '/admin');
});

// ---- Errors ----
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not_found' });
  res.status(404).send('Not found');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: 'internal_error' });
  res.status(500).send('خطای داخلی');
});

app.listen(PORT, () => console.log(`melligold-mock listening on http://localhost:${PORT}`));
