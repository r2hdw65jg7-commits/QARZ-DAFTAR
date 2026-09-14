# 🎮 Qarz Daftar — Game Club Boshqaruv Tizimi

Kompyuterxona va Game Club'lar uchun **qarzdorlik + magazin + ombor + kassa** boshqaruv dasturi.
To‘liq **o‘zbek tilida**, offline ishlaydi, ma’lumotlar avtomatik backup qilinadi.

> Bitta tizim: qarz yozasiz → to‘lov qabul qilasiz → magazindan sotasiz → ombor va kassa avtomatik yangilanadi.

---

## ⚡ Tez boshlash (3 ta usul)

| Usul | Kimga | Qanday |
|---|---|---|
| **1. Bitta HTML fayl** | Tezda sinab ko‘rish, USB'da olib yurish | `qarz-daftar.html` — hammasi bitta faylda, 2 marta bosing |
| **1b. Oddiy loyiha** | Kodni tahrirlash | `index.html` faylini brauzerda oching |
| **2. Veb ilova (PWA)** | Bir nechta kompyuter | GitHub Pages'ga joylang → "Install" tugmasi orqali dastur sifatida o‘rnating |
| **3. Windows dasturi (.exe)** | Real Game Club | `npm install && npm run dist` → `dist/` papkasida o‘rnatuvchi fayl |

> **Eslatma:** to‘liq avtomatik backup (papkani tanlash) uchun **Chrome/Edge** yoki **Windows dasturi** kerak.
> Firefox/Safari'da faqat qo‘lda export/import ishlaydi.

---

## 📦 Imkoniyatlar

### Qarz moduli
- Mijoz qo‘shish (ism, telefon, Telegram, izoh)
- Qarz yozish (summa, sana, to‘lash muddati, sabab, kassir)
- **Qisman to‘lov** — har bir to‘lov alohida tarix sifatida saqlanadi
- To‘lov turlari: Naqd, Karta, Click, Payme, Uzum, Boshqa
- Qolgan qarz avtomatik: `Qolgan = SUM(qarzlar) − SUM(to‘lovlar)`
- To‘lovni aniq qarzga biriktirish yoki **avtomatik FIFO** (eng eski qarzdan) taqsimlash
- Muddat nazorati: 🟢 muddat bor · 🟡 bugun to‘lanadi · 🔴 muddati o‘tgan (necha kun kechikkani bilan)
- Filtrlar: bugungi / muddati o‘tgan / to‘lanmagan / qisman / to‘langan + sana oralig‘i
- Sortirovka: eng katta, eng kichik, eng yangi, eng eski, eng katta kechikish
- Mijoz profili: moliyaviy holat + qarz tarixi + to‘lov tarixi + magazin xaridlari
- Chek chiqarish (qarz cheki, to‘lov cheki), mijoz hisobotini chop etish

### Magazin va ombor
- Mahsulotlar (kategoriya, tannarx, sotish narxi, birlik, shtrix-kod, minimal qoldiq)
- POS kassa: savatcha, tezkor qidiruv, chek
- To‘lov turi **"Qarz"** tanlansa → summa mijoz qarziga qo‘shiladi, kassaga tushmaydi
- Omborga kirim (bir nechta mahsulot bitta hujjatda), kirim tarixi, bekor qilish
- Sotuvda ombor avtomatik kamayadi; qoldiq 0 bo‘lsa sotishga yo‘l qo‘yilmaydi
  (admin xohlasa "manfiy qoldiq bilan sotish" sozlamasini yoqishi mumkin)
- Ombor harakatlari: 🟢 kirim · 🔴 sotuv · 🟠 chiqim · 🔵 tuzatish
- Inventarizatsiya: haqiqiy qoldiqni kiritasiz → farq va sababi yozilib, ombor tuzatiladi
- Yetkazib beruvchilar, kam qolgan / tugagan mahsulotlar ogohlantirishi

### Kassa, hisobot, xavfsizlik
- Kassa: manba (sotuv / qarz to‘lovi) va to‘lov turi bo‘yicha tushum
- Hisobotlar: kunlik / haftalik / oylik / tanlangan davr + grafiklar
- TOP qarzdorlar, eng ko‘p sotilgan va eng ko‘p foyda keltirgan mahsulotlar
- Audit log — **har bir amal saqlanadi va o‘chirilmaydi** (o‘chirilgan operatsiyalar ham)
- Export: Excel · CSV · PDF/Chop etish · JSON (to‘liq baza)
- Avto backup + restore (pastda batafsil)

---

## 💾 Avto Backup tizimi

1. **Sozlamalar → Backup → "Papkani tanlash"** — papka **bir marta** tanlanadi va eslab qolinadi
   (masalan `D:\GameClub Backup\`, USB disk ham bo‘ladi).
2. Har qanday o‘zgarishdan **keyin** (mijoz, qarz, to‘lov, sotuv, kirim, inventarizatsiya…)
   backup avtomatik ishlaydi. Tugma bosish shart emas.
3. Har safar yangi fayl yaratilmaydi — doim **bitta `GameClub_Backup.db`** fayli yangilanadi.
4. Yozish **atomik**: `GameClub_Backup.tmp` → tekshiriladi (JSON + jadvallar) → keyin asosiy faylga almashtiriladi.
   Yozish paytida kompyuter o‘chsa ham eski backup buzilmaydi.
5. Kassir ketma-ket ma’lumot kiritsa — **debounce** (standart 1.5 s) tufayli dastur sekinlashmaydi.
   Dastur yopilishidan oldin kutilayotgan backup majburiy bajariladi.
6. Xato bo‘lsa sababi ko‘rsatiladi (papka yo‘q, disk yo‘q, ruxsat berilmagan, disk to‘lgan, fayl bloklangan) —
   **lekin dastur ishlashdan to‘xtamaydi.**
7. **Restore**: fayl tekshiriladi → ichidagi ma’lumot ko‘rsatiladi → tasdiqlashdan so‘ng tiklanadi.
   Tiklashdan **oldin** joriy baza `GameClub_Safety_Backup.db` ga zaxiralanadi.
8. Backup tarixi (sana, amal, holat, hajm) Sozlamalar sahifasida ko‘rinadi.

---

## 🖥 Windows uchun .exe yig‘ish

```bash
npm install          # Electron va electron-builder
npm start            # dasturni sinab ko‘rish
npm run dist         # dist/ ichida o‘rnatuvchi (.exe) va portable versiya
```

GitHub'da avtomatik yig‘ish: `v1.0.0` kabi tag qo‘yilsa,
`.github/workflows/build-windows.yml` Windows uchun `.exe` yasab, Release'ga qo‘shadi:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

---

## 🌐 GitHub'da "app" qilish (3 qadam)

### 1-qadam. Kodni GitHub'ga joylash
```bash
git clone https://github.com/<foydalanuvchi>/<repo>.git
cd <repo>
git add . && git commit -m "Qarz Daftar" && git push
```

### 2-qadam. GitHub Pages'ni yoqish (majburiy, bir marta)
1. Repo → **Settings** → **Pages**
2. **Build and deployment → Source**: `GitHub Actions` ni tanlang
3. Repo → **Actions** → **GitHub Pages'ga joylash** → **Run workflow** (yoki `main` ga yangi push qiling)
4. 1–2 daqiqadan so‘ng sayt tayyor: `https://<foydalanuvchi>.github.io/<repo>/`

> ⚠️ Pages'ni workflow o‘zi yoqa olmaydi — GitHub buni `GITHUB_TOKEN` orqali taqiqlaydi
> (`Resource not accessible by integration`). Shuning uchun 2-qadamni bir marta qo‘lda bajarish shart.
> Agar bu qadam bajarilmasa, `deploy` job'i "Get Pages site failed" xatosi bilan to‘xtaydi
> (testlar baribir o‘tadi).

> Alternativa: **Settings → Pages → Source: Deploy from a branch → `main` → `/ (root)`** —
> bu holda workflow kerak emas, GitHub saytni to‘g‘ridan-to‘g‘ri branchdan joylaydi.

### 3-qadam. Telefon/kompyuterga dastur sifatida o‘rnatish (PWA)
- **Chrome / Edge (kompyuter):** manzil qatoridagi ⊕ **Install** belgisini bosing →
  dastur alohida oyna sifatida ochiladi, ish stolida yorliq paydo bo‘ladi.
- **Android:** Chrome menyusi → **Add to Home screen**
- **iPhone:** Safari → Share → **Add to Home Screen**
- Internet uzilsa ham ishlaydi (service worker offline kesh).

> ⚠️ Muhim: har bir qurilma **o‘z brauzerida** ma’lumot saqlaydi. Bir nechta kassir bitta bazadan
> foydalanishi kerak bo‘lsa — Windows dasturidan foydalaning va backup papkasini umumiy tarmoq
> papkasiga qo‘ying, yoki Export/Import orqali ma’lumot almashing.

---

## ⌨️ Tezkor tugmalar

| Tugma | Amal |
|---|---|
| `Q` | Yangi qarz |
| `T` | To‘lov qabul qilish |
| `M` | Magazin (kassa) |
| `/` | Global qidiruv |
| `Esc` | Oynani yopish |

---

## 🧱 Arxitektura

```
index.html                 — interfeys skeleti
assets/css/styles.css      — dark/light dizayn, responsive
assets/js/core.js          — ma'lumotlar bazasi, hisob-kitob, validatsiya (UI'dan mustaqil)
assets/js/backup.js        — avto backup (File System Access + Electron adapter)
assets/js/components.js    — modal, toast, jadval, grafik, chek
assets/js/views-debt.js    — bosh sahifa, qarzlar, mijozlar, to'lovlar
assets/js/views-shop.js    — POS, sotuvlar, mahsulotlar, ombor, yetkazib beruvchilar
assets/js/views-report.js  — kassa, hisobotlar, audit, sozlamalar
assets/js/app.js           — router, global qidiruv, eksport
electron/                  — Windows desktop qobiq + atomik fayl backup
tools/build-single.js      — hamma narsani bitta HTML faylga yig'ish (npm run build:single)
tests/                     — hisob-kitob va backup testlari (node)
```

**Ma’lumotlar bazasi jadvallari:** `customers`, `debts`, `payments`, `products`, `categories`,
`suppliers`, `stock_movements`, `purchases`, `purchase_items`, `sales`, `sale_items`,
`inventory_adjustments`, `audit_logs`, `settings`, `backup_logs`.

**Hisob-kitob qoidasi:** hech qanday balans "qo‘lda" saqlanmaydi. Har bir ko‘rsatkich har safar
bazadagi yozuvlardan hisoblanadi:

```
Jami qarz   = SUM(debts.amount)
Jami to‘lov = SUM(payments.amount)
Qolgan qarz = Jami qarz − Jami to‘lov
Ombor qoldiq = SUM(stock_movements.qty)   // kirim +, sotuv −, chiqim −, tuzatish ±
Foyda        = SUM((sotish narxi − tannarx) × miqdor)
```

Barcha summalar **butun son (integer) so‘m** — floating point xatolari bo‘lmaydi.

---

## 🧪 Testlar

```bash
npm test
```

- `tests/run-tests.js` — 52 ta tekshiruv: pul formatlash, qisman to‘lov, FIFO taqsimot, muddat
  nazorati, validatsiya, ombor qoldig‘i, qarzga sotish, bekor qilish, audit, export/import,
  performance (2 000 mijoz · 40 000 yozuv → ~0.3 s)
- `tests/backup-test.js` — 16 ta tekshiruv: atomik yozish, bitta fayl qoidasi, buzilgan faylni
  aniqlash, safety backup, xatoliklarda eski backupning saqlanishi

---

## ❓ Ko‘p so‘raladigan savollar

**Ma’lumotlar qayerda saqlanadi?**
Brauzerning localStorage'ida + tanlangan papkadagi `GameClub_Backup.db` faylida.
Windows dasturida ham shunday, lekin backup to‘g‘ridan-to‘g‘ri diskka yoziladi.

**Backup papkasi o‘chib ketsa?**
Sozlamalarda 🔴 "Backup papkasi topilmadi" ko‘rsatiladi. Dastur ishlashda davom etadi —
yangi papka tanlang.

**Noto‘g‘ri qarz/to‘lov kiritilsa?**
Tahrirlash yoki o‘chirish mumkin. O‘chirilgan operatsiya **audit logda** sababi bilan qoladi.

**Mijozni o‘chirib bo‘lmayapti?**
Qarz yoki to‘lov tarixi bor mijoz o‘chirilmaydi — moliyaviy tarix buzilmasligi uchun.
Xuddi shunday, sotuvi bo‘lgan mahsulot o‘chirilmaydi, arxivga o‘tadi.
