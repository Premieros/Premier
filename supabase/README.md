# قاعدة البيانات (Supabase)

يحتوي هذا المجلد على ملفات SQL المطلوبة لبناء قاعدة بيانات تطبيق نقاط البيع.

## الترتيب الكنسي للتطبيق (من صفر أو على قاعدة موجودة)

نفّذ الملفات بالترتيب التالي في Supabase SQL Editor على قاعدة موجودة،
أو بالكامل لبناء قاعدة جديدة:

1. `combined_setup.sql` — البنية الأساسية (16 جدولًا) + سياسات RLS + `is_pos_admin()`.
2. `migration_inventory_v2.sql` — `stock_transactions` + دوال `process_sale` / `process_purchase` / `adjust_stock`.
3. `migration_components.sql` — جدول `product_components` (المكونات/BOM).
4. `migration_enterprise_core.sql` — العزل بالفروع + الأدوار المؤسسية + نظام الشيفتات + دوال إدارة المستخدمين
   (`create_user`, `delete_user`, `update_user_password`, `open_shift`, `close_shift`, `get_active_shift`, `process_sale`).
5. `migration_branch_products.sql` — تخصيص المنتجات لكل فرع.
6. `migration_audit_fixes.sql` — أحدث إصلاحات مرجعية (آمن لإعادة التشغيل):
   - إسقاط/إعادة تعريف الدوال بحراسة لتجنب خطأ `42P13`.
   - إعادة بناء جدولي الشيفتات تلقائيًا إذا كانت بنيتهما قديمة (`shifts` / `shift_operations`).
   - ضمان مفاتيح أجنبية (بينها `shifts_cashier_id_fkey` ومفاتيح المستخدمين الأساسية).
   - سياسات RLS صارمة للجداول الحساسة.
   - توسيع `settings` وإضافة `branch_settings` (إعدادات عامة + لكل فرع).
   - جدول `roles` (مصفوفة الصلاحيات بالدور، قابلة للتعديل من شاشة الإعدادات)،
     إسقاط `users.permissions` (نموذج دور فقط)، وإزالة دورَي `kitchen` / `customer_display`.
7. `migration_fix_login.sql` — أدوات تشخيص/إصلاح تسجيل الدخول للمستخدمين الجدد
   (`verify_auth_account` / `repair_auth_account` / `password_matches`) — تُشغَّل عند الحاجة فقط.
8. `migration_pin_login.sql` — تسجيل الدخول باسم المستخدم + رقم سري (4 أرقام):
   - عمود `username` في `users` + تعبئة تلقائية من البريد الإلكتروني للحسابات الموجودة.
   - دالة `get_login_email(username)` (متاحة للـ anon) للبحث قبل تسجيل الدخول.
   - `create_user` يقبل `p_username`، و`update_user_password` يقبل رقماً سرياً من 4 أرقام.

> ملاحظة: الملفات القديمة (`migrations/` المؤرّخة، `migration_phase1/2`,
> `migration_create_user`, `migration_user_password_delete`, `run_all_migrations`,
> `demo_data`) أُزيلت لأنها كانت مكرّرة أو مكسورة؛ كل ما كان فيها أُدمج في الملفات أعلاه.

## ملاحظات مهمة

- `migration_audit_fixes.sql` مصمم ليكون **قابلًا لإعادة التشغيل** بأمان (idempotent)
  ويُعيد فرض الحالة المرجعية الحالية للقاعدة. إذا واجهت خطأ من ترحيل قديم، شغّله مجددًا.
- بعد أي تشغيل لتغييرات بنيوية، أعد تحميل كاش schema الخاص بـ PostgREST
  (الملف يفعل ذلك تلقائيًا عبر `NOTIFY pgrst, 'reload schema'`).
