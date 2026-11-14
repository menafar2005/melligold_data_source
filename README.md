# melligold-mock

سرویس ساختگی ملی گلد برای دمو، روی Cloudflare Workers + D1 (SQLite): یک API برای پلاگین دیدار و یک پنل ادمین ساده.

## اجرای محلی

```bash
npm install
```

فایل `.dev.vars` بساز (در `.gitignore` است):

```
MELLIGOLD_API_KEY=یک-رشته-تصادفی
ADMIN_PASSWORD=رمز-ادمین
```

```bash
npm start        # wrangler dev → http://localhost:8787
```

بعد از اولین اجرا در `/admin` دکمه‌ی «بازگردانی داده‌ی نمونه» ۵ کاربر نمونه را وارد می‌کند (جدول‌ها خودکار ساخته می‌شوند).

## دیپلوی روی Cloudflare (اتصال به GitHub)

1. در Workers & Pages پروژه را از ریپوی GitHub بساز؛ Deploy command همان `npx wrangler deploy` است.
2. `wrangler deploy` دیتابیس D1 با نام `melligold` را خودش می‌سازد و به `DB` وصل می‌کند.
3. در Settings ← Variables and Secrets این دو **Secret** را اضافه کن: `MELLIGOLD_API_KEY` و `ADMIN_PASSWORD`.
4. قیمت هر گرم در `wrangler.toml` (`GOLD_PRICE_PER_GRAM_TOMAN`) است.
5. `https://<worker>.workers.dev/admin` را باز کن و داده‌ی نمونه را وارد کن.

## API

```bash
curl -H "X-API-Key: $MELLIGOLD_API_KEY" https://<worker>.workers.dev/api/v1/users/by-mobile/09121234567
```

پاسخ `200`: `user` و `gold` (`grams`، `pricePerGramToman`، `valueToman`، `updatedAt`).
خطاها: `400 invalid_mobile`، `401 unauthorized`، `404 user_not_found`، `500 internal_error`.

## پنل ادمین

`/admin` — Basic Auth با کاربر `admin` و رمز `ADMIN_PASSWORD`. ساخت کاربر، تغییر موجودی و حذف؛ تغییرها بلافاصله در API دیده می‌شوند. `GET /healthz` برای چک ساده.
