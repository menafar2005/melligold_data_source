const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fa = new Intl.NumberFormat('fa-IR');
const faGrams = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Asia/Tehran' }).format(d);
}

export function renderAdmin({ users, price, valueToman, errors = [], form = {} }) {
  const rows = users
    .map(
      (u) => `<tr>
  <td>${esc(u.fullName)}</td>
  <td dir="ltr">${esc(u.mobile)}</td>
  <td>${faGrams.format(u.grams)}</td>
  <td>${fa.format(valueToman(u.grams, price))}</td>
  <td>${formatTime(u.updatedAt)}</td>
  <td>
    <form method="post" action="/admin/users/${u.id}/gold" class="inline">
      <input type="text" inputmode="decimal" name="goldGrams" value="${esc(u.grams)}" dir="ltr" size="9" required>
      <button type="submit">ثبت موجودی</button>
    </form>
    <form method="post" action="/admin/users/${u.id}/delete" class="inline" onsubmit="return confirm('کاربر حذف شود؟')">
      <button type="submit" class="danger">حذف</button>
    </form>
  </td>
</tr>`
    )
    .join('\n');

  const errBox = errors.length
    ? `<div class="errors">${errors.map((e) => `<p>${esc(e)}</p>`).join('')}</div>`
    : '';

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>پنل ادمین ملی گلد (دمو)</title>
<style>
  body { font-family: Tahoma, "Segoe UI", sans-serif; margin: 0; background: #f6f4ee; color: #222; }
  main { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; margin-top: 0; }
  .card { background: #fff; border: 1px solid #e3dfd2; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .price { font-weight: bold; color: #8a6d00; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: right; padding: 8px; border-bottom: 1px solid #eee; vertical-align: middle; }
  th { background: #faf8f1; }
  input { padding: 6px; border: 1px solid #ccc; border-radius: 4px; font: inherit; }
  button { padding: 6px 12px; border: 0; border-radius: 4px; background: #b8860b; color: #fff; cursor: pointer; font: inherit; }
  button.danger { background: #b3261e; }
  form.inline { display: inline-block; margin: 0 0 0 4px; }
  .new-user { display: flex; gap: 8px; flex-wrap: wrap; align-items: end; }
  .new-user label { display: flex; flex-direction: column; gap: 4px; font-size: .9rem; }
  .errors { background: #fdecea; border: 1px solid #f5c2be; color: #8c1d18; border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; }
  .errors p { margin: 4px 0; }
</style>
</head>
<body>
<main>
  <h1>پنل ادمین ملی گلد (دمو)</h1>
  ${errBox}
  <div class="card">
    <p>قیمت هر گرم طلا: <span class="price">${fa.format(price)} تومان</span></p>
    <h2>کاربر جدید</h2>
    <form method="post" action="/admin/users" class="new-user">
      <label>نام و نام خانوادگی <input name="fullName" value="${esc(form.fullName || '')}" required></label>
      <label>موبایل <input name="mobile" value="${esc(form.mobile || '')}" dir="ltr" placeholder="09121234567" required></label>
      <label>موجودی اولیه (گرم) <input name="goldGrams" value="${esc(form.goldGrams || '0')}" dir="ltr" inputmode="decimal" required></label>
      <button type="submit">ساخت کاربر</button>
    </form>
  </div>
  <div class="card">
    <table>
      <thead><tr><th>نام</th><th>موبایل</th><th>موجودی (گرم)</th><th>ارزش (تومان)</th><th>آخرین تغییر</th><th>عملیات</th></tr></thead>
      <tbody>
${rows || '<tr><td colspan="6">کاربری وجود ندارد.</td></tr>'}
      </tbody>
    </table>
    <form method="post" action="/admin/seed" onsubmit="return confirm('همه‌ی کاربران پاک و داده‌ی نمونه جایگزین شود؟')">
      <p><button type="submit" class="danger">بازگردانی داده‌ی نمونه (۵ کاربر)</button></p>
    </form>
  </div>
</main>
</body>
</html>`;
}
