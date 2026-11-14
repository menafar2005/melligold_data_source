# melligold-mock

سرویس ساختگی ملی گلد برای دمو: دیتابیس SQLite، یک API برای پلاگین دیدار و یک پنل ادمین ساده.

## اجرا

```bash
npm install
cp .env.example .env     # در ویندوز: copy .env.example .env  ← سپس مقادیر را پر کنید
npm run seed             # دیتابیس را خالی و ۵ کاربر نمونه را وارد می‌کند
npm start                # یا npm run dev
```

متغیرهای `.env`:

| متغیر | کار | نمونه |
|---|---|---|
| `PORT` | پورت (پیش‌فرض ۴۰۰۰) | `4000` |
| `MELLIGOLD_API_KEY` | کلید مشترک با پلاگین | رشته‌ی تصادفی |
| `GOLD_PRICE_PER_GRAM_TOMAN` | قیمت ثابت هر گرم | `10500000` |
| `ADMIN_PASSWORD` | رمز پنل ادمین (کاربر `admin`) | — |
| `DB_PATH` | مسیر فایل SQLite | `data/melligold.db` |

## API

```bash
curl -H "X-API-Key: $MELLIGOLD_API_KEY" http://localhost:4000/api/v1/users/by-mobile/09121234567
```

پاسخ `200`: `user` و `gold` (`grams`، `pricePerGramToman`، `valueToman`، `updatedAt`).
خطاها: `400 invalid_mobile`، `401 unauthorized`، `404 user_not_found`، `500 internal_error`.

## پنل ادمین

`http://localhost:4000/admin` — Basic Auth با کاربر `admin` و رمز `ADMIN_PASSWORD`.
ساخت کاربر، تغییر موجودی و حذف کاربر؛ تغییرها بلافاصله در API دیده می‌شوند.

`GET /healthz` برای چک ساده.
