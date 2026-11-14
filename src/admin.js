const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fa = new Intl.NumberFormat('fa-IR');
const faGrams = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(d);
}

const STYLE = `
:root {
  --bg: #f7f5f0; --surface: #fff; --text: #1f2328; --muted: #6b7280; --line: #ece8dd;
  --gold: #b8860b; --gold-soft: #fbf3dc; --gold-ink: #7a5a00;
  --danger: #c0392b; --danger-soft: #fdeceb; --radius: 14px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #14130f; --surface: #1d1b16; --text: #ece9e1; --muted: #9a958a; --line: #2f2c24;
    --gold: #d9a82a; --gold-soft: #2b2410; --gold-ink: #f0cd6e;
    --danger: #e8645a; --danger-soft: #331b19;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: Vazirmatn, Tahoma, sans-serif; font-size: 15px; line-height: 1.7; }
.wrap { max-width: 1080px; margin: 0 auto; padding: 24px 16px 48px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
header h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
header .badge { background: var(--gold-soft); color: var(--gold-ink); border-radius: 999px; padding: 2px 12px; font-size: .8rem; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; }
.stat .label { color: var(--muted); font-size: .82rem; }
.stat .value { font-size: 1.25rem; font-weight: 700; margin-top: 2px; }
.stat .value small { font-size: .8rem; font-weight: 400; color: var(--muted); }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; margin-bottom: 16px; }
.card h2 { margin: 0 0 12px; font-size: 1rem; font-weight: 700; }
.errors { background: var(--danger-soft); border: 1px solid var(--danger); color: var(--danger); border-radius: 10px; padding: 8px 14px; margin-bottom: 16px; }
.errors p { margin: 2px 0; }
label { display: flex; flex-direction: column; gap: 4px; font-size: .85rem; color: var(--muted); }
input { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; min-width: 0; }
input:focus { outline: 2px solid var(--gold); outline-offset: -1px; border-color: transparent; }
button { font: inherit; font-weight: 500; border: 0; border-radius: 10px; padding: 8px 16px; background: var(--gold); color: #fff; cursor: pointer; transition: opacity .15s; }
button:hover { opacity: .88; }
button.ghost { background: transparent; color: var(--danger); border: 1px solid var(--line); }
button.ghost:hover { background: var(--danger-soft); opacity: 1; }
button.sm { padding: 6px 12px; font-size: .85rem; }
.new-user { display: grid; grid-template-columns: 2fr 1.4fr 1fr auto; gap: 12px; align-items: end; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: right; font-weight: 500; font-size: .8rem; color: var(--muted); padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
td { padding: 12px 10px; border-bottom: 1px solid var(--line); vertical-align: middle; }
tr:last-child td { border-bottom: 0; }
.name { font-weight: 500; }
.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
.muted { color: var(--muted); font-size: .85rem; white-space: nowrap; }
.actions { display: flex; gap: 6px; align-items: center; }
.actions form { display: flex; gap: 6px; margin: 0; }
.actions input { width: 96px; padding: 6px 10px; text-align: left; }
.empty { text-align: center; color: var(--muted); padding: 28px 0; }
.footer { display: flex; justify-content: flex-start; margin-top: 4px; }
@media (max-width: 760px) {
  .stats { grid-template-columns: 1fr; }
  .new-user { grid-template-columns: 1fr; }
}
`;

export function renderAdmin({ users, price, valueToman, errors = [], form = {} }) {
  const totalGrams = users.reduce((s, u) => s + u.grams, 0);

  const rows = users
    .map(
      (u) => `<tr>
  <td class="name">${esc(u.fullName)}</td>
  <td class="num" dir="ltr">${esc(u.mobile)}</td>
  <td class="num">${faGrams.format(u.grams)}</td>
  <td class="num">${fa.format(valueToman(u.grams, price))}</td>
  <td class="muted">${formatTime(u.updatedAt)}</td>
  <td>
    <div class="actions">
      <form method="post" action="/admin/users/${u.id}/gold">
        <input type="text" inputmode="decimal" name="goldGrams" value="${esc(u.grams)}" dir="ltr" aria-label="موجودی جدید" required>
        <button type="submit" class="sm">ثبت</button>
      </form>
      <form method="post" action="/admin/users/${u.id}/delete" onsubmit="return confirm('کاربر حذف شود؟')">
        <button type="submit" class="sm ghost">حذف</button>
      </form>
    </div>
  </td>
</tr>`
    )
    .join('\n');

  const errBox = errors.length ? `<div class="errors" role="alert">${errors.map((e) => `<p>${esc(e)}</p>`).join('')}</div>` : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پنل ادمین ملی گلد (دمو)</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>پنل ادمین ملی گلد</h1>
    <span class="badge">دمو</span>
  </header>
  ${errBox}
  <section class="stats">
    <div class="stat"><div class="label">قیمت هر گرم</div><div class="value">${fa.format(price)} <small>تومان</small></div></div>
    <div class="stat"><div class="label">تعداد کاربران</div><div class="value">${fa.format(users.length)}</div></div>
    <div class="stat"><div class="label">مجموع طلا</div><div class="value">${faGrams.format(totalGrams)} <small>گرم</small></div></div>
  </section>
  <section class="card">
    <h2>کاربر جدید</h2>
    <form method="post" action="/admin/users" class="new-user">
      <label>نام و نام خانوادگی <input name="fullName" value="${esc(form.fullName || '')}" required></label>
      <label>موبایل <input name="mobile" value="${esc(form.mobile || '')}" dir="ltr" placeholder="09121234567" required></label>
      <label>موجودی اولیه (گرم) <input name="goldGrams" value="${esc(form.goldGrams || '0')}" dir="ltr" inputmode="decimal" required></label>
      <button type="submit">ساخت کاربر</button>
    </form>
  </section>
  <section class="card">
    <h2>کاربران</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>نام</th><th>موبایل</th><th>موجودی (گرم)</th><th>ارزش (تومان)</th><th>آخرین تغییر</th><th>تغییر موجودی</th></tr></thead>
        <tbody>
${rows || '<tr><td colspan="6" class="empty">کاربری وجود ندارد. از «بازگردانی داده‌ی نمونه» استفاده کن.</td></tr>'}
        </tbody>
      </table>
    </div>
  </section>
  <form method="post" action="/admin/seed" class="footer" onsubmit="return confirm('همه‌ی کاربران پاک و داده‌ی نمونه جایگزین شود؟')">
    <button type="submit" class="ghost sm">بازگردانی داده‌ی نمونه (۵ کاربر)</button>
  </form>
</div>
</body>
</html>`;
}
