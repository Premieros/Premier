# ERP-01 — تقرير التنفيذ والتحقق

- الحالة: **VERIFICATION PENDING** — لم تُغلق ERP-01 بعد؛ الإغلاق يتوقف على إتمام PHASE F (بيئة Supabase الحية) وإغلاق التوثيق النهائي والمراجعة والـPR.
- الفرع: `erp-01-settings-organization` (قاعدة `main` بعد دمج P7).
- `main`: لم يُلمس. لا PR مفتوح. لم يُبدأ ERP-02.
- التاريخ: 2026-08-14.

---

## 1. ما تم فعليًا (PHASE G + البوابات المحلية F)

### 1.1 PHASE G — التوثيق (مكتمل)

استُعيد الملفان إلى الفرع من مصادر محددة ثم حُدّثا ليعكسا الحالة الفعلية (وليس "NOT STARTED"):

| الملف | المصدر | ما حُدّث |
|---|---|---|
| `docs/ERP-01_EXECUTION_PLAN.md` | `origin/main@8f717e8` | الحالة → VERIFICATION PENDING؛ جدول إنجاز A→G مع علامات ✅؛ استبدال `CURRENT STATUS` بسجل إتمام كامل |
| `docs/ERP_DEVELOPMENT_ROADMAP.md` | `origin/erp-roadmap-safe@e7ca527` | قسم ERP-01 + `Implementation Status` → VERIFICATION PENDING مع السجل |
| `docs/REBUILD_MASTER_LOG.md` | موجود في الشجرة | إدخال ERP-01 موجز (Completed + Pending) |

#### سجل الإنجاز المُدوَّن في الخطة (الالتزامات A→E)

| Commit | المرحلة | التغيير |
|---|---|---|
| `469256b` | مواصفة | `docs/ERP-01_SETTINGS_POS_REPORTS_SPEC.md` |
| `5e8444d` | A1 | `docs/ERP-01_SETTINGS_AUDIT.md` — أسطح الإعدادات + مصفوفة المستهلكين |
| `b8a7459` | A2–A11 | مركز تحكم إعدادات موحّد + ربط مستهلكي حقيقيين (POS/فاتورة/مخزون/ضرائب/عملة/أمان) |
| `b70ffed` | B1 | POS يفتح افتراضيًا على Takeaway مع تبديل النوع في أي وقت |
| `6d8cae6` | B2–B3 | شريط تنقل سفلي (طلبات نشطة/توصيل/طاولات) بلا مغادرة الورشة |
| `363b608` | C1–C3 | إصلاح Resume/KDS التزايدي + اختبارات انحدار |
| `a2bc51e` | D1–D4 | معاينة فاتورة كاملة في الدفع؛ الحفاظ على المنطق والطرق؛ جاهزية طلب جديد بعد الدفع (Takeaway) |
| `1f38fcd` | E1–E4 | مركز تقارير موحّد: فلاتر سياقية ديناميكية + إخراج Excel/CSV/طباعة |

#### الهجرة 069 (قاعدة البيانات/RPC)

- `supabase/migrations/069_resume_order_kitchen_incremental.sql`: إعادة كتابة `update_order` (نفس التوقيع، إضافية) لتحافظ على `order_item_id` للأسطر المتطابقة (نفس المنتج/الوحدة/السعر/الخصم/الكمية الإضافية). النتيجة: الأصناف المُرسَلة سابقًا لا تُعاد أبدًا؛ الأصناف الجديدة تُرسَل مرة واحدة؛ إعادة حفظ السلة ذاتها = no-op للمطبخ (`items_sent_count` 0).
- لا تغيير في RLS/grants/كائنات schema؛ لا تغيير بيانات إنتاج.

#### الاختبارات المضافة (ERP-01)

- `tests/unit/reportFilters.test.ts` (9)، `tests/unit/reportExport.test.ts` (6)، توسعة `tests/unit/reportsCenterContract.test.ts`، `tests/components/pos-payment-panel.test.tsx`، `tests/integration/kitchen_sends.test.ts` (حي).

#### القيود الموثقة

- لا توجد خدمة/رسوم توصيل في النظام (سطور الإيصال الخاصة بالتوصيل عرضية حيث وُجدت).
- الدفع المختلط غير مدعوم من الخلفية/المحاسبة — تُحفظ طريقة دفع واحدة لكل بيع.
- E3: أوضاع تحليل مجمّعة/اتجاهات صريحة غير منفَّذة (التقارير تُجمّع حسب النوع).
- دين تقني سابق (من P7): `src/features/pos/hooks/usePosSummary.ts` غير مستخدم — قرار تنظيف مستقبلي.

### 1.2 PHASE F — البوابات المحلية (خضراء على تثبيت نظيف)

| البوابة | النتيجة |
|---|---|
| `npm ci` | ✅ 477 حزمة |
| `npm run lint` | ✅ 0 أخطاء / 16 تحذيرًا قائمة |
| `npm run typecheck` | ✅ |
| `npm run typecheck:all` | ✅ |
| `npm run test:unit` | ✅ 236/236 عبر 19 ملفًا |
| `npm run build` | ✅ |

### 1.3 إصلاح واحد مُسجَّل

- **`@playwright/test` لم يكن مصرَّحًا به في package.json** رغم استخدامه في `tests/e2e/*.spec.ts` و`playwright.config.ts` — أظهره `npm ci` النظيف عبر فشل `typecheck:all`. أُعلن كـdevDependency (`@playwright/test@^1.62.1`) في الالتزام `32d2faa`، فأصبح التثبيت وفحص الأنواع حتميين.

### 1.4 مراجعة هجرة 069 وRLS/الأمان (قرائية)

- استبدال دالة فقط بلا تغيير RLS/grants/schema؛ مراجعة ثابتة مؤكدة. التصديق الحي معلّق على بيئة Supabase.

---

## 2. ما لم يُنفَّذ (محجوب على بيئة Supabase الحية)

لا يوجد `.env` في الشجرة (git-ignored)، ولم تُخترَع أي قيم ولم تُتجاوز الاختبارات. المطلوب:

1. **`npm run test:integration` ضد Supabase الحي** — أُكد تخطي المجموعة ذاتيًا (154/154، 10 ملفات). يتطلب `SUPABASE_DB_URL` (أو `DATABASE_URL`). يغطي هجرة 069 + سلسلة RLS/الأمان (`rls_branch_isolation`، `p0_security_hardening`، `rbac_hardening`، `phase4_security_contract`، `process_sale_*`، `update_order`، `floorplan_orders`، `order_lifecycle_guards`).
2. **E2E** (`pos-actions`، `public-smoke`، `dashboard-navigation`) — Playwright 1.62.1 وchromium مثبّتان والـspecs تجاوب الشبكة بالكامل، لكن البناء يحتاج `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (من `src/lib/supabase.ts`).
3. **تصديق RLS الحي** لهجرة 069.

---

## 3. الالتزامات الجديدة في هذا التقرير

| Commit | الوصف |
|---|---|
| `8e8b937` | docs(erp-01): complete ERP-01 execution record + roadmap status |
| `32d2faa` | fix(erp-01): declare @playwright/test devDependency so npm ci and typecheck:all are deterministic |
| `b45d78b` | docs(erp-01): record PHASE F local-gate results and live-env blockers |

---

## 4. الحالة والتالي

- **ERP-01: VERIFICATION PENDING.** لم تُغلق، ولم يُلمس `main`، ولا PR، ولا ERP-02.
- لإغلاق F: توفير قيم البيئة (تُكتب في `.env` محلي git-ignored) ثم تشغيل `test:integration` الحي وE2E، يليها إغلاق التوثيق النهائي والمراجعة والـPR.
