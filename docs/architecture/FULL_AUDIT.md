# FULL PROJECT AUDIT — Premier POS/ERP

> **Baseline:** branch `main` @ `107a9ae` (`feat(rbac): gate CRUD UI by *.manage + wire login lockout RPCs`) — clean working tree.
> **Branch for work:** `stabilization/refactor`.
> **Date:** 2026-08-08
> **Method:** full read of `src/` (70 files), all migrations 001–044, scripts, tests, configs; cross-device flow tracing for POS Tables/Orders.

---

## 1. Project structure

```
D:\pos3\project\
├── .github\workflows\deploy.yml        # CI/CD: lint + typecheck + unit + build + db(postgres:18) + pages deploy
├── .env / .env.production              # (NOTA: .env.production مُتتبَّع في git — مشكلة)
├── netlify.toml / public\              # نشر بديل + static assets
├── scripts\db\                         # apply-migration.js + verify-schema.js (51 جدولًا / 46 دالة)
├── supabase\
│   ├── migrations\001..044             # السلسلة الكاملة (44 migration) — مصدر الحقيقة
│   ├── legacy\                         # مرجعي فقط (لا يُطبَّق)
│   └── ci\stub_auth.sql                # محاكاة Auth للـ CI
├── tests\
│   ├── unit\lib\                       # format / brandColor / permissionDefs
│   ├── components\pages.smoke.test.tsx # 30 صفحة (FloorPlanPage غير مشمولة)
│   └── integration\                    # RLS matrix + floorplan orders + process_sale pricing
├── src\
│   ├── main.tsx / index.css
│   ├── api\        (client.ts, modules.ts, types.ts, index.ts)   # RPC wrappers (~44 دالة)
│   ├── app\        (App.tsx, providers.tsx, routes.tsx — 31 مسار Lazy)
│   ├── components\ (10 مكوّنات مشتركة)
│   ├── context\    (Auth, Roles, Settings, Language, Theme)
│   ├── hooks\      (useBranches.ts — الوحيد)
│   ├── lib\        (types.ts 1003 سطرًا، i18n.ts 1210، permissionDefs.ts 391، + أدوات)
│   └── features\   (31 صفحة عبر 11 وحدة)
```

**كل ملف في `src/` قابل للوصول** — لا توجد ملفات يتيمة بالكامل. لا يوجد `src/types/` (النماذج في `lib/types.ts` + `api/types.ts`).

---

## 2. Unused files

**لا يوجد ملف كامل غير مستخدم.** كل ملفات `src/` مستوردة من مكان ما (routes.tsx / tests / providers).

**غير متتبع لكنه موجود في شجرة العمل:**
- `dist/` — ناتج build قديم (gitignored).
- `tsconfig.app.tsbuildinfo` / `tsconfig.node.tsbuildinfo` — بقايا في الجذر (الإعداد الحالي يكتب لـ `node_modules/.tmp`).

**ملفات مرفوعة رغم عدم ضرورتها (candidates for removal — انظر CANDIDATE_FOR_REMOVAL.md):**
- `.env.production` — **مُتتبَّع في git** (`d483eb6`).
- `START SERVER.bat` — مسار جهاز مخصوص.
- `.bolt/config.json` + `.bolt/prompt` — بقايا scaffold.

---

## 3. Duplicate files

لا توجد ملفات مكررة حقيقية. `supabase/legacy/*` مرجعية مقصودة (مؤرشفة، لا تُطبَّق).

**ازدواج بيانات (وليس ملفات):** `FloorPlanPage` و`PosPage` يجلبان `dining_tables`, `branches`, `products` كلٌّ على حدة بلا كاش مشترك.

---

## 4. Duplicate components

لا توجد مكوّنات مكررة. `ConfirmDialog` يغلّف `Modal` (تركيب سليم). `StatCard`/`Card` مخرَجة من `PageHeader.tsx` (لا ملفات منفصلة).

---

## 5. Dead code

- `src/lib/excel.ts`: `downloadTemplate` — **غير مستورد أبدًا**.
- `src/lib/brandColor.ts`: `applyBrandHex` — **غير مستورد أبدًا**.
- `src/lib/i18n.ts`: `translations` — مُصدَّر لكن يُستخدم داخليًا فقط.
- `PosPage.tsx:205`: حقول `cash_sales`/`total_sales` في `activeShift` غير مقروءة أبدًا.
- `src/api/types.ts`: `StatementLineInput` — غير مستورد (لا حتى في modules.ts).

---

## 6. Unused functions

| الدالة | الملف | الحالة |
|---|---|---|
| `downloadTemplate` | `lib/excel.ts` | غير مستخدمة |
| `applyBrandHex` | `lib/brandColor.ts` | غير مستخدمة |
| `detachOrder` | `PosPage.tsx:577` | تستخدم فعليًا لكن سلوكها خاطئ (تفصل الـ refs المحلية فقط بلا تسوية DB) |

---

## 7. Unused hooks

لا يوجد hook كامل غير مستخدم. `useBranches` مستخدم في 7 صفحات. `useBranchFilter` في 8 صفحات.

---

## 8. Unused types

`src/lib/types.ts` (88 نوعًا): **29 نوعًا غير مستوردة خارج الملف**:
`ShiftStatus, ShiftOperationType, ShiftOperation, ProductType, Sale, SaleItem, PurchaseItem, OrderStatus, DiningTableLayout, ProductionStatus, ProductionWaste, WasteInput, TransferStatus, WarehouseTransferItem, TransferItemInput, InventoryBatch, LedgerEntryType, StockTransaction, JournalEntry, JournalEntryLine, OpenInvoice, AgingBucket, TreasuryTransactionType, ReconciliationStatus, BankStatementLine, BookCandidate, JournalLineDto, AuditTrailRow, PartyStatementRow`.

أنواع مستخدمة داخليًا فقط: `BrandPreset, BrandValue, DEFAULT_BRAND, DEFAULT_SURFACE, UiThemeMode, UiThemePreset, PermissionGroup, LogoTone, LogoVariant`.

> ملاحظة: بعض هذه الأنواع تختبر تحقق schema (مثل `AuditTrailRow`) — لا حذف منفّذ؛ توثيق فقط.

---

## 9. Unused imports

لا توجد imports يتيمة في الصفحات (ESLint نظيف). المشكلة المعمارية هي **الاستيراد من `@/api` ثم استدعاء `supabase.from()` مباشرة** (انظر §15).

---

## 10. Unused npm packages

| الحزمة | الحالة |
|---|---|
| `date-fns@^4.4.0` | **غير مستخدمة** (صفر imports) |
| `@testing-library/user-event` | **غير مستخدمة** (صفر imports) |
| `xlsx@0.18.5` | مستخدمة (lazy import) لكن **لديها CVEs معروفة** |

---

## 11. Unused assets

- `public/` — كل الملفات مستخدمة (`404.html`, `app-icon.svg`, `favicon.svg`, `_redirects`).
- لا توجد صور/أصول يتيمة داخل src.

---

## 12. Large files (مسؤوليات متعددة / حجم كبير)

| الملف | الأسطر | ملاحظة |
|---|---|---|
| `src/features/pos/pages/PosPage.tsx` | 1526 | **الأهم للتقسيم** — cart, checkout, receipt, shift, barcode, orders, tables |
| `src/features/dashboard/pages/DashboardPage.tsx` | 1050 | KPIs + charts + alerts + settings |
| `src/lib/i18n.ts` | 1210 | ملف ترجمة كبير (طبيعي لكن يمكن تجزيئه) |
| `src/lib/types.ts` | 1003 | 88 نوعًا + 29 غير مستخدمة |
| `src/features/admin/pages/SettingsPage.tsx` | 727 | 8 تبويبات إعدادات |
| `src/features/pos/pages/FloorPlanPage.tsx` | 668 | map + orders + actions |
| `src/features/accounting/pages/FinancialReportsPage.tsx` | 532 | 9 تقارير مالية |
| `src/features/catalog/pages/ProductsPage.tsx` | 480 | CRUD + units + barcode + import/export |

---

## 13. Duplicate database queries

- **جدول الاشغال مكرر:** `PosPage.loadSummary` (`:303-321`) يستعلم `dining_tables` count و`orders`؛ `FloorPlanPage.load` (`:95-129`) يستعلم الكامل. لا كاش مشترك.
- **`products` يجلب مرتين:** PosPage (`:396-401`) وFloorPlanPage (`:111-113`) كلاهما بنفس فرع.
- **`branches`:** يجلبها Layout/PosPage/FloorPlanPage/كل صفحة إدارة بشكل مستقل.
- **`warehouses`:** PosPage `loadStock` (`:239-258`) و`completeSale` (`:670-671`) يستفسران نفس القائمة في كل عملية.
- **`getStock`** تُحسب من `stockMap` لكن `loadStock` تُعاد بناءه بالكامل عند أي تغيير فرع.

---

## 14. Duplicate business logic

- **الاحتلال/التحرير مكرر منطقيًا:** `set_table_status` (037) + `create_order` (037) + `set_order_status` (037) + `process_sale` (038) جميعها تعالج حالة الطاولة بطرق متوازية غير منسقة → مصدر التناقضات.
- **حساب إجماليات البيع مكرر:** `PosPage` (`:594-600`) و`process_sale` (`038:142-152`) يحسبان subtotal/discount/tax/total بصيغتين قد تختلفان (الواجهة تعرض، الخادم يفرض — فرق ممكن بسبب تقريب).
- **`change` يحسب من `paidAmount`** في `:600` و`687` بينما البيع يستخدم `paidAmountToUse` — حالة آجل تعرض تغييرًا غير مدفوع.

---

## 15. Context problems

- **حدود البيانات اسمية:** 30/31 صفحة تستورد `@/api` لكنها تستدعي `supabase.from(...)` مباشرة في جسم الصفحة (DashboardPage: 22 استدعاء، ReportsPage: 19، ProductsPage: 14). `no-restricted-imports` مستوى `warn` ويحظر الاسم `supabase` من `@/lib/supabase` فقط — والاستيراد عبر `@/api` يتجاوزه.
- **حالة POS موزعة بلا مخزن مشترك:** `tableId/orderId/orderType/guestCount` مكررة في PosPage وFloorPlanPage كـ local state، لا sync بينهما.

---

## 16. State management problems

- لا يوجد state manager (zustand/Redux) — مناسب لمعظم المشروع، لكن **POS يحتاج مخزن مشترك** بين PosPage وFloorPlanPage (حالة الطاولات/الطلبات المفتوحة).
- `useState` محلي في صفحات ضخمة (PosPage ~20 useState) يجعل الفهم والاختبار صعبين.
- `location.state` يُستخدم لنقل حالة الطلب بين الصفحات — هشّ (يفقد عند refresh مباشر).

---

## 17. Performance problems

- استعلامات مكررة بين صفحات (انظر §13).
- `loadStock`/`loadSummary` تُعاد عند كل تغيير branch بلا debounce.
- الاشتراك realtime الوحيد (`PosPage:323-350`) يستدعي `loadSummary` لكل حدث orders/dining_tables (mutable مع debounce 300ms — مقبول لكن بدون فائدة للـ FloorPlan).
- re-renders غير ضرورية: `setCart` بـ `.map` إنشاء مصفوفة جديدة في كل تفاعل.
- `buildItemsPayload`/`subtotal` useMemo صحيحان.

---

## 18. Error handling problems

- **C1 (حرج):** `process_sale` (038:192-207) يتحقق من الطلب **بعد** كتابة الفاتورة + الأصناف + خصم المخزون. `RETURN` لا يلغي المعاملة → نجاح فعلي مع رسالة فشل، وإعادة المحاولة = بيع مزدوج.
- `setTableStatus(...).catch(()=>{})` يبتلع الفشل (PosPage:568, 742) → تحرير طاولة قد يفشل بصمت.
- `setOrderStatus('held')` بدون فحص النتيجة (PosPage:647).
- `loadOrder` لا يتحقق من `order.status`/الفرع (PosPage:261-300) ويستأنف طلبات منتهية.
- `loadError` في PosPage يظهر لكن بعض المسارات لا تتعامل معه.

---

## 19. Security concerns

- **`.env.production` مُتتبَّع في git** (`d483eb6`) — يحتوي `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (anon key عام بالتصميم) لكنه tripwire للـ service-role/DB URL مستقبلًا.
- **`get_login_email`** أنون-callable (SECURITY DEFINER) → سطح تعرّف مستخدمين خفيف (يخدّم PIN login فقط، لا يجيب عن الحسابات المقفلة).
- **`xlsx@0.18.5`** CVE-2023-30533 (prototype pollution) + CVE-2024-22363 (ReDoS) يُستخدمان في رفع ملفات (ProductsPage/CustomersPage).
- **لا توجد قيم سرية مكشوفة** في الكود المصدري أو git history للفروع الحالية (فحص grep). `.env` غير متتبع.

### SECRET DETECTED
```
FILE: .env.production (committed in git, d483eb6)
TYPE: Supabase anon key + project URL (public by design; NO service_role / DB URL present)
RISK: LOW now — HIGH as a leak tripwire if secrets are ever added to it
ACTION REQUIRED: git rm --cached .env.production + remove from git history + add to .gitignore
```

---

## 20. Testing gaps

- **Smoke test يغطي 30 صفحة فقط** — `FloorPlanPage` (راوتينغ `/floor-plan`) مستبعدة.
- **Smoke test لا يتحقق من شكل البيانات:** mock يعيد `{data:[],error:null}` ثابتًا → تغيير شكل الاستعلام لا يُكتشف. الادعاء في تعليقه مبالغ فيه.
- **لا يوجد اختبار وظيفي لـ PosPage** (cart/checkout/discount/payment flows) — فقط smoke mount.
- **C1 بدون اختبار:** لا يوجد اختبار يثبت أن فشل تسوية الطلب لا يكتب sale.
- **لا يوجد اختبار لـ C2** (إعادة hold مكررة).
- **لا يوجد اختبار لـ detachTable** (تحرير الطاولة مع طلب مفتوح).
- **Integration قوي:** RLS matrix (92+ حالة)، floorplan orders، pricing — لكن لا يغطي حالات C1/C2.

---

## 21. Documentation gaps

| الملف | المشكلة |
|---|---|
| `CODEMAP.md` | يقول migrations `001..032` (الواقع 001–044)؛ يقول 46 جدولًا/43 دالة (الواقع 51/46)؛ يقول 26 مسارًا (الواقع 31)؛ لا يذكر FloorPlanPage |
| `DEPENDENCY_MAP.md` | لا يذكر realtime/042، لا يذكر floorplan RPCs (create_order...) |
| `README.md` | ✅ أُصلح في PHASE 4: `base: './'` أصبح مطابقًا + يذكر Netlify |
| `supabase/README.md` | يقول 001–032 (الواقع 001–044) |
| — | لا يوجد `KNOWN_ISSUES.md` ولا `FINAL_PROJECT_REPORT.md` |

---

## تصنيف المشاكل

### CRITICAL
- **C1** — `process_sale` يكتب البيع ثم يرجع `ORDER_NOT_FOUND` (038:192-207): بيع وهمي + خصم مزدوج. خاصة لطلبات takeaway/delivery المحفوظة (بلا table) أو عند الدفع من جهازين.
- **C2** — `holdOrder` ينشئ طلبًا مكررًا عند إعادة الحفظ لطلب مستأنف (PosPage:620-662): طلبان أحياء على نفس الطاولة.

### HIGH
- **H1** — `detachTable` يحرر الطاولة مع بقاء الطلب مفتوحًا مربوطًا (PosPage:561-575). `detachOrder` (577-584) بدون أي كتابة DB.
- **H2** — لا حارس اشغال: `create_order`/`set_table_status` لا تتحقق من تناقض الحالات (037).
- **H3** — تحرير الطاولة في البيع المباشر غير ذرّي + `.catch(()=>{})` (PosPage:741-743).
- **H4** — `process_sale` يحرر الطاولة بأول طلب فقط ولا يفحص طلبات أخرى على نفس الطاولة (038:205-206).
- **H5** — `xlsx@0.18.5` CVEs في رفع الملفات.
- **H6** — `.env.production` متتبع في git.

### MEDIUM
- **M1** — FloorPlanPage بلا realtime/refetch بين الأجهزة.
- **M2** — `loadOrder` يستأنف طلبات منتهية ويعيد احتلال الطاولة.
- **M3** — `holdOrder` يضبط held بلا فحص النتيجة.
- **M4** — `deleteTable` يحذف طاولة عليها طلبات مفتوحة (ON DELETE SET NULL).
- **M5** — `ordersByTable` يأخذ أول طلب فقط لكل طاولة (يخفي الثاني).
- **M6** — `vite.config.ts` base مطلق يكسر Netlify + يناقض README.
- **M7** — حد البيانات غير مفروض (30/31 صفحة تستدعي `from()` مباشرة).
- **M8** — `change` يُحسب من `paidAmount` لا `paidAmountToUse` (آجل).
- **M9** — `guestCount` لا يُخزَّن في sales.
- **M10** — حزم غير مستخدمة (date-fns, user-event).

### LOW
- **L1** — `dine_in` قابل للاختيار بلا طاولة في الـ checkout → طلب بلا table → يقع في C1.
- **L2** — لا CHECK constraints على `orders.status/order_type` و`dining_tables.status`.
- **L3** — تغيير الفرع يمسح `orderId` محليًا بلا تسوية DB (PosPage:1020-1027).
- **L4** — `loadOrder` جلب منتجات غير مقيد بفرع؛ الأصناف غير الموجودة تُسقط بصمت.
- **L5** — `FloorPlanPage` لا يفلتر `is_active` للطاولات.
- **L6** — حقول `cash_sales/total_sales` غير مستخدمة (PosPage:205).
- **L7** — `switchOrderType`/`loadOrder` يكتبان `occupied` فوق `reserved`.
- **L8** — انجراف توثيقي (CODEMAP/DEPENDENCY_MAP/README/supabase README).

---

## أهداف المراحل القادمة (ملخص)

1. **Migration 045** — إصلاح C1: تحقق الطلب قبل الكتابة + `RAISE` بدل `RETURN` + regression test.
2. **إصلاح C2** — `holdOrder` يحدّث الطلب الحالي.
3. **Cleanup** — حزم/ملفات غير مستخدمة + `.env.production` من git.
4. **Deployment** — `base: './'`.
5. **Services** — تجميع استعلامات الطاولات/الطلبات المشتركة.
6. **تقسيم PosPage** تدريجيًا.
7. **دورة Tables/Orders** — حارس اشغال، detach سليم، deleteTable آمن، realtime للـ FloorPlan.
8. **Testing** — تغطية FloorPlanPage + regression C1/C2 + تحسين smoke.
9. **توثيق** — تحديث CODEMAP/DEPENDENCY_MAP/README + KNOWN_ISSUES + FINAL_REPORT.
