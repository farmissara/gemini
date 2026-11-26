# คู่มือการเชื่อมต่อฐานข้อมูล Supabase และนำขึ้นเว็บ Render.com
### (Supabase PostgreSQL Integration & Render.com Deployment Guide)

เอกสารนี้รวบรวมขั้นตอนการเชื่อมต่อฐานข้อมูล **Supabase (PostgreSQL)** และการนำระบบ **EduVerse** ขึ้นโฮสต์ออนไลน์ฟรีบน **Render.com** แบบละเอียดและทำตามได้ทันที

---

## ส่วนที่ 1: การตั้งค่าฐานข้อมูล Supabase (PostgreSQL)

### 1.1 สร้างโปรเจกต์ Supabase
1. ไปที่เว็บไซต์ [https://supabase.com](https://supabase.com) แล้วเข้าสู่ระบบหรือสมัครสมาชิก
2. คลิกปุ่ม **"New project"**
3. ตั้งชื่อโครงการ (เช่น `eduverse-school`), กำหนด Database Password และเลือก Region (แนะนำ `Southeast Asia (Singapore)`)
4. รอระบบสร้างฐานข้อมูลประมาณ 1-2 นาที

### 1.2 ติดตั้งโครงสร้างฐานข้อมูลและสิทธิ์ (SQL Schema & RLS)
ใช้ไฟล์ใน `supabase/migrations/` เป็นแหล่ง schema ที่เรียงลำดับและตรวจสอบใน CI แล้ว อย่ารัน `supabase/schema.sql` ซ้ำกับ migrations บนฐานข้อมูลเดียวกัน

**ฐานข้อมูลใหม่:** ติดตั้ง Supabase CLI และ Docker แล้วทดสอบ migration ชุดเต็มในเครื่องก่อน:

```bash
npx supabase start
npx supabase db reset --no-seed
npx supabase stop
```

เมื่อ migration ผ่านและโปรเจกต์ปลายทางยังเป็นฐานข้อมูลใหม่ที่ไม่มีประวัติ SQL Editor ให้ link โปรเจกต์ ตรวจแผน แล้วจึง apply:

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

**ฐานข้อมูลที่ใช้งานอยู่แล้ว:** สำรองฐานข้อมูลก่อนทุกครั้ง และตรวจ `supabase migration list --linked` เทียบกับ SQL ที่เคยรันจริงก่อน deploy ห้าม `db push` หรือรัน `schema.sql` แบบเหมารวมจนกว่าจะ reconcile ประวัติ migration โดยเฉพาะโปรเจกต์ที่เคยติดตั้งผ่าน SQL Editor ให้ทดลองกับ staging/สำเนาฐานข้อมูลก่อน แล้ว apply เฉพาะ migration ที่ตรวจสอบแล้วว่ายังขาด

CI จะเริ่ม Supabase local แบบว่างและรัน `db reset` ทุก migrations ใน pull request ถ้าขั้นตอนนี้ล้มเหลว ห้ามนำ migration ชุดนั้นขึ้น production

ไฟล์ `supabase/register_school_signup_migration.sql` และ `supabase/super_admin_registration_approval_migration.sql` เป็น SQL เสริมที่อยู่นอกชุด migrations อัตโนมัติ ให้ตรวจประวัติฐานข้อมูลและทดสอบกับ staging ก่อนใช้ หากเปิดคิวอนุมัติโรงเรียน migration ดังกล่าวจะจำกัดการแก้ role/status ผ่าน RLS และเพิ่ม RPC ที่ตรวจ role `super_admin`

> สำรองฐานข้อมูลก่อนเปลี่ยน RLS บนโปรเจกต์ที่มีข้อมูลอยู่แล้ว และตรวจว่ามีบัญชี/โปรไฟล์ผู้ดูแลที่ใช้งานได้หลัง apply ทุกครั้ง

### 1.3 เปิดสมัครโรงเรียนและบัญชีผู้ใช้
1. ใน Supabase ไปที่ **Authentication → Providers → Email** และเปิดการยืนยันอีเมล (Confirm email) เพื่อให้ระบบเปิดใช้งานโรงเรียนใหม่หลังยืนยันแล้ว ตรวจสอบ **Authentication → URL Configuration** ให้ Site URL และ Redirect URLs อนุญาต URL ของแอป
2. ในหน้า EduVerse เลือก **สมัครสมาชิก → ลงทะเบียนโรงเรียน** กรอกชื่อโรงเรียน, ประเภท, จังหวัด, ชื่อผู้ดูแล, อีเมล และรหัสผ่าน โรงเรียนจำนวนมากสามารถสมัครแยก tenant ได้ โดยไม่ต้องเพิ่มข้อมูลโรงเรียนล่วงหน้า
3. ระบบสร้างโรงเรียนและบัญชี `admin` แยกกันในฐานข้อมูล; รหัสโรงเรียนและ slug สร้างให้อัตโนมัติ สถานะเริ่มต้นเป็น `pending` และจะเปลี่ยนเป็น `active` พร้อมบัญชีผู้ดูแลเมื่อ Supabase ยืนยันอีเมลสำเร็จ หากอีเมลยืนยันมีปัญหา Super Admin เข้า **ศูนย์ควบคุมระบบ → อนุมัติการสมัครโรงเรียน** เพื่อตรวจสอบและอนุมัติด้วยตนเองได้ โดยระบบจะยืนยันอีเมลให้ด้วยหากยังไม่ยืนยัน
4. การอนุมัติด้วยตนเองเป็นการข้ามการพิสูจน์ว่าเจ้าของบัญชีเข้าถึงอีเมลนั้นได้ ต้องตรวจสอบตัวตนผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง ระบบบันทึกผู้อนุมัติ เวลา และวิธีอนุมัติไว้ในข้อมูลโรงเรียน คำขอที่แสดงในคิวนี้คือการสมัครโรงเรียน/ผู้ดูแลโรงเรียนใหม่ ไม่ใช่การอนุมัติบัญชีนักเรียน
5. นักเรียนไม่สามารถสมัครบัญชีเองได้ ผู้ดูแลโรงเรียนต้องเพิ่มหรือนำเข้าระเบียนนักเรียนก่อน:
   - นักเรียนที่มีอีเมล ใช้คำเชิญจากหน้าจัดการนักเรียน ผู้รับเปิดลิงก์ทางอีเมลเพื่อตั้งค่าบัญชี
   - นักเรียนที่ไม่มีอีเมล ใช้ **ตั้งค่าระบบ → อนุมัติ & ผูกบัญชีนักเรียน** เพื่อสร้างบัญชีให้นักเรียนที่ยังไม่มีบัญชี ระบบออกรหัสสุ่ม 8 ตัว (ตัวพิมพ์ใหญ่และตัวเลขที่ไม่สับสน) ให้ผู้ดูแลแสดง/คัดลอกครั้งเดียว รหัสหมดอายุใน 24 ชั่วโมง นักเรียนเข้าสู่ระบบด้วยรหัสโรงเรียนและรหัสนักเรียน แล้วต้องตั้งรหัสผ่านส่วนตัวก่อนใช้งาน

   ห้ามใช้ SQL สมัครหรือผูกบัญชีนักเรียนด้วยตนเอง สำหรับครูและผู้ปกครอง ผู้ดูแลสามารถกดเชิญจากหน้า **บุคลากรและครู** และ **นักเรียน** ได้โดยตรง
6. Deploy Edge Function สำหรับส่งคำเชิญ โดยติดตั้ง Supabase CLI, เชื่อมโปรเจกต์ที่ถูกต้อง แล้วรัน:

   ```bash
   supabase link --project-ref <project-ref>
   supabase functions deploy invite-student
   supabase functions deploy invite-staff-parent
   supabase secrets set APP_SITE_URL=https://khaonangtuam-eduverse.onrender.com
   ```

   Function ใช้ `SUPABASE_URL`, `SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ฝั่งเซิร์ฟเวอร์ของ Supabase; ห้ามใส่ service-role key ใน frontend หรือ `VITE_*` secret `APP_SITE_URL` เป็น URL ของเว็บที่ต้องการให้ลิงก์เชิญกลับมา
7. Deploy ฟังก์ชันบัญชีนักเรียนจาก Supabase Dashboard โดยตรง:
   - ก่อน Deploy ให้นำ `supabase/migrations/20261120_student_temporary_credentials.sql` ไปรันใน **SQL Editor**
   - เปิด **Edge Functions** แล้วเลือกสร้าง/Deploy function ใหม่ผ่าน Editor ตั้งชื่อ `manage-student-credentials`
   - คัดลอกโค้ดทั้งหมดจาก `supabase/functions/manage-student-credentials/index.ts` มาวางใน Editor แล้วกด Deploy
   การรัน SQL อย่างเดียวไม่สามารถ Deploy Edge Function ได้
8. บัญชีครู/ผู้ปกครองของโรงเรียนที่มีอยู่แล้วต้องสร้างโดยผู้ดูแลผ่าน Supabase Dashboard หรือช่องทางที่เชื่อถือได้ และกำหนด role ผ่าน SQL Editor เท่านั้น ตัวอย่างกำหนดผู้ดูแลเพิ่มเติม:

   ```sql
   INSERT INTO public.user_profiles (id, school_id, role, full_name_th, full_name_en)
   SELECT id, '<school-id>', 'teacher', 'ชื่อบุคลากร', 'School staff'
   FROM auth.users WHERE email = 'staff@example.com'
   ON CONFLICT (id) DO UPDATE
     SET school_id = EXCLUDED.school_id, role = EXCLUDED.role, status = 'active';
   ```

   เปลี่ยน `<school-id>`, ชื่อ, role และอีเมลให้ตรงกับข้อมูลจริง สำหรับผู้ปกครองให้สร้าง Auth user แล้วเพิ่มโปรไฟล์และความสัมพันธ์ผ่าน SQL Editor:

   ```sql
   INSERT INTO public.user_profiles (id, school_id, role, full_name_th, full_name_en)
   SELECT id, '<school-id>', 'parent', 'ชื่อผู้ปกครอง', 'Parent Name'
   FROM auth.users
   WHERE email = 'parent@example.com'
   ON CONFLICT (id) DO UPDATE
     SET school_id = EXCLUDED.school_id, role = EXCLUDED.role, status = 'active';

   INSERT INTO public.parent_student_links (profile_id, school_id, student_id)
   SELECT p.id, s.school_id, s.id
   FROM public.user_profiles p
   JOIN public.students s ON s.id = '<student-record-id>'
   WHERE p.id = (SELECT id FROM auth.users WHERE email = 'parent@example.com')
   ON CONFLICT DO NOTHING;
   ```

#### ตั้งค่าการแจ้งเตือนส่วนตัวบนแอปผู้ปกครอง (PWA Push)

การแจ้งเตือนจะส่งถึงบัญชีผู้ปกครองที่เชื่อมอยู่ใน `parent_student_links` ของนักเรียนคนนั้นเท่านั้น ไม่มีการส่งเข้า LINE กลุ่ม และ Push บนหน้าจอล็อกจะแสดงข้อความทั่วไปโดยไม่ใส่ชื่อหรือรายละเอียดนักเรียน ปัจจุบันมีการแจ้งเตือนการเข้า/ออกโรงเรียนและการกดส่งแจ้งเตือนใบแจ้งหนี้รายนักเรียน

1. สร้าง VAPID keys บนเครื่องผู้ดูแลด้วย `npx --yes web-push generate-vapid-keys` เก็บค่า public/private ไว้ให้ตรงคู่กัน ห้ามส่ง private key ในแชตหรือ commit ลง Git
2. ตั้ง secrets ฝั่ง Supabase Edge Functions แล้ว deploy ฟังก์ชัน:

   ```bash
   supabase secrets set \
     VAPID_PUBLIC_KEY='PASTE_PUBLIC_KEY' \
     VAPID_PRIVATE_KEY='PASTE_PRIVATE_KEY' \
     VAPID_SUBJECT='mailto:admin@example.com'
   supabase functions deploy parent-private-push
   ```

3. ตั้งค่า `VITE_VAPID_PUBLIC_KEY` เป็นค่า public key คู่เดียวกันใน Render และ `.env.local` สำหรับพัฒนาในเครื่อง จากนั้น build/deploy frontend ใหม่
4. ผู้ปกครองติดตั้ง EduVerse เป็นแอปบนอุปกรณ์ เข้าสู่ระบบบัญชี role `parent` ที่โรงเรียนเชื่อมกับนักเรียนแล้ว เปิดศูนย์การแจ้งเตือน → ตั้งค่า → เปิดการแจ้งเตือนบนอุปกรณ์นี้ การเปิด Push เป็นตัวเลือกและปิดได้ภายหลัง
5. iPhone/iPad ต้องเพิ่มเว็บลงหน้าจอโฮมก่อนจึงจะใช้ Web Push ได้ (iOS/iPadOS 16.4 ขึ้นไป) และต้องอนุญาตการแจ้งเตือนในระบบปฏิบัติการด้วย

#### ตั้ง Gmail เป็นผู้ส่งอีเมล Supabase Auth

อีเมลยืนยันสมาชิกและลิงก์รีเซ็ตรหัสผ่านส่งผ่าน SMTP ของ Supabase ไม่ได้กำหนดผู้ส่งจากโค้ดหน้าเว็บ หากต้องการใช้ `baanpakkru@gmail.com`:

1. เปิดการยืนยันแบบ 2 ขั้นตอนในบัญชี Google แล้วสร้าง **Google App Password** สำหรับใช้กับ Supabase
2. ใน Supabase ไปที่ **Authentication → Emails → SMTP Settings** (ตำแหน่งเมนูอาจต่างกันตาม Dashboard) แล้วเปิดใช้งาน Custom SMTP
3. กรอกค่าเหล่านี้:
   - Host: `smtp.gmail.com`
   - Port: `465` (SSL) หรือ `587` (STARTTLS)
   - Username: `baanpakkru@gmail.com`
   - Sender email: `baanpakkru@gmail.com`
   - Sender name: `BaanPakKru`
   - Password: Google App Password
4. ใน **Authentication → URL Configuration** ตั้ง Site URL เป็น URL Render จริง และเพิ่ม URL ของ Render กับ `http://localhost:3000/**` ใน Redirect URLs
5. บันทึกการตั้งค่าแล้วทดสอบสมัครบัญชีและส่งลิงก์ยืนยันใหม่ รวมถึงทดสอบลืมรหัสผ่าน ตรวจโฟลเดอร์ Spam หากไม่พบอีเมล

หากหน้าเว็บแจ้ง `Error sending recovery email` ปัญหาอยู่ที่ Supabase Auth ส่งอีเมลไม่สำเร็จ ไม่ใช่การรัน SQL migration ให้ตรวจว่าเปิด Custom SMTP แล้ว, credentials ถูกต้อง, sender address ใช้งานได้ และ **Authentication → URL Configuration** อนุญาต URL ของเว็บที่ใช้งานจริงทั้ง Site URL และ Redirect URLs จากนั้นตรวจ Auth logs ใน Supabase เพื่อดูข้อผิดพลาดจากผู้ให้บริการ SMTP โดยตรง

ใส่ App Password ใน Supabase Dashboard โดยตรงเท่านั้น ห้ามใช้รหัสผ่าน Google ปกติ ห้ามส่ง App Password ในแชต และห้ามเก็บไว้ในโค้ด, Git หรือ environment variable ฝั่ง `VITE_*` Gmail ส่วนบุคคลมีข้อจำกัดการส่งและอาจไม่เหมาะกับอีเมลปริมาณมาก

การตั้งค่านี้ครอบคลุมอีเมล Supabase Auth เช่น ยืนยันสมาชิกและรีเซ็ตรหัสผ่านเท่านั้น ปัจจุบันอีเมลแจ้งเตือนทั่วไป/ประกาศในแอปยังไม่ได้เชื่อมกับบริการส่งจริง และค่า Resend Sender ในหน้า System Settings ยังไม่ใช่การตั้งค่า SMTP หรือการส่งอีเมลจริง

### 1.4 ดึงค่าการเชื่อมต่อ (API Credentials)
1. ไปที่ **Project Settings** (ไอคอนฟันเฟืองด้านล่างซ้าย) → เลือกแท็บ **API**
2. คัดลอกค่า 2 ตัวต่อไปนี้:
   - **Project URL** (เช่น `https://xxxxxx.supabase.co`)
   - **anon/publishable key** (คีย์ฝั่ง client ที่เปิดเผยได้เมื่อ RLS ถูกตั้งถูกต้อง)

---

## ส่วนที่ 2: การนำขึ้นเว็บ Render.com (Deploy to Render)

โปรเจกต์นี้ใช้ **Render Web Service** (Node/Express) เพราะมี API ฝั่งเซิร์ฟเวอร์และ health check ที่ `/api/health`.

### 2.1 ตรวจสอบไฟล์ที่เตรียมไว้ในโปรเจกต์
ในโปรเจกต์นี้มีไฟล์ Blueprint สำหรับ Render ซึ่ง build ด้วย `npm ci && npm run build`, รันด้วย `npm start` และตรวจสุขภาพที่ `/api/health`:
- `public/_redirects`: มีกฎ `/* /index.html 200` ป้องกันปัญหาหน้าย่อย 404 เมื่อ Refresh หรือเข้าผ่าน URL ตรง
- `render.yaml`: Blueprint Config สำหรับสร้างบริการบน Render อัตโนมัติ

### 2.2 ขั้นตอนการ Deploy บน Render.com
1. **Push โค้ดทั้งหมดขึ้น GitHub**:
   ```bash
   git add .
   git commit -m "feat: configure supabase integration and render deployment"
   git push origin main
   ```
2. ไปที่ [https://dashboard.render.com](https://dashboard.render.com)
3. เลือก **New + → Blueprint** แล้วเชื่อม Repository `farmissara/gemini` สาขา `main` ที่มี `render.yaml`
4. ตรวจชื่อบริการ `khaonangtuam-eduverse` และกรอกค่าที่ Blueprint ขอ:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = publishable key ของ Supabase (ใช้ anon key ได้หากโปรเจกต์ยังแสดงคีย์รุ่นเดิม)
5. กด **Apply** รอ Deploy ผ่าน แล้วเปิด URL ที่ Render แสดง ตรวจหน้าเว็บและ `/api/health`

ห้ามใส่ `service_role` key หรือรหัสผ่านฐานข้อมูลใน `VITE_*`; การตั้งอีเมลยืนยันทำใน Supabase SMTP ตามข้อ 1.3 ไม่ได้ทำใน Render.

---

## ส่วนที่ 3: ตั้งค่าแอปและการบันทึกข้อมูล

ตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` (หรือ `VITE_SUPABASE_PUBLISHABLE_KEY`) ใน environment ของ Render และไฟล์ `.env.local` สำหรับพัฒนาในเครื่อง สำหรับ AI endpoints ให้ตั้งค่า `SUPABASE_URL`/`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_REST_URL`/`REDIS_REST_TOKEN` และ `SCHOOL_AI_ENCRYPTION_KEY` บน production server ด้วย หากไม่มี Redis ระบบจะปิด AI endpoints ใน production เพื่อไม่ให้การจำกัดการเรียกถูกข้ามได้ สร้าง encryption key ด้วย `openssl rand -hex 32`; เก็บค่านี้ใน Render และสำรองไว้ในที่ปลอดภัย เพราะการเปลี่ยน key โดยไม่เข้ารหัสข้อมูลใหม่จะทำให้ถอดรหัส Gemini key ที่โรงเรียนบันทึกไว้ไม่ได้ ห้ามนำ `service_role` key, Gemini API key หรือรหัสผ่านฐานข้อมูลมาใส่ใน `VITE_*` หรือ frontend

หลัง migration และ deploy แล้ว ผู้ดูแลโรงเรียนไปที่ **System Settings → Packages and AI** เพื่อใส่ Gemini API key จาก Google AI Studio และกำหนดโควตาคำขอต่อเดือน ระบบแสดงจำนวนคำขอและ token ที่ใช้ แต่โควตาคำขอไม่ใช่วงเงินเป็นบาท และ Google เรียกเก็บเงินกับ Google project ที่เป็นเจ้าของ API key โดยตรง API keys จะไม่ถูกรวมในไฟล์สำรอง ต้องตั้งใหม่หลัง restore

### สำรองและกู้คืนไฟล์ในเครื่อง

ศูนย์สำรองข้อมูลดาวน์โหลดไฟล์ JSON ที่เข้ารหัสในเบราว์เซอร์ด้วย AES-256-GCM โดยผู้ดูแลตั้ง passphrase เอง (อย่างน้อย 12 ตัวอักษร) ระบบไม่ส่งหรือบันทึก passphrase; หากลืมจะกู้ไฟล์ไม่ได้ เก็บ passphrase แยกจากไฟล์สำรองและอย่าแนบไฟล์ที่มีข้อมูลนักเรียนในช่องทางสาธารณะ ไฟล์ JSON รุ่นเก่าที่ยังไม่เข้ารหัสยังนำเข้าผ่านหน้ากู้คืนได้

การสำรอง/กู้คืนเป็นแบบสั่งเอง ไม่มีการอัปโหลดไฟล์ไปยัง Google Drive และไม่มี scheduled backup บน Render การสำรองรวมได้เฉพาะตารางและ Storage ที่ backup API รองรับ; รหัสผ่านบัญชีและคีย์ AI ไม่รวมอยู่ในไฟล์ ดูข้อจำกัดรายโมดูลได้ใน [`docs/data-persistence.md`](./docs/data-persistence.md) และทดสอบการกู้คืนกับ Supabase staging ก่อนใช้ไฟล์กับ production

### ซ้อมกู้คืนบน Staging

1. สร้าง Render service และ Supabase project สำหรับ Staging แยกจาก Production แล้วติดตั้ง migrations ให้ครบ ห้ามใช้ Supabase URL หรือ service-role key ของ Production
2. ตั้ง `BACKUP_RESTORE_ENVIRONMENT=staging` เฉพาะ environment variables ของ Render Staging เท่านั้น หากไม่ตั้ง โหมดซ้อมจะถูกปิด
3. ตรวจว่า Staging มีบัญชี Auth และ `user_profiles` ที่ตรงกับข้อมูลต้นทาง (โดยเฉพาะ user ID/UUID และ role) เพราะไฟล์สำรองไม่มีรหัสผ่านและระบบซ้อมจะไม่สร้างบัญชีให้อัตโนมัติ
4. เข้าระบบ Staging ด้วย Super Admin เปิดศูนย์สำรอง เลือก **ซ้อมกู้คืนบน Staging** แล้วเลือกไฟล์จาก Production
5. ตรวจโปรเจกต์ต้นทาง/ปลายทาง จำนวนแถวแต่ละตาราง จำนวนไฟล์ใน Storage และรายการที่ไม่รวม ก่อนยืนยัน
6. ตรวจผลนำเข้าและข้อมูลจริงใน Staging การซ้อมเป็นแบบเพิ่ม/ปรับปรุง ไม่ลบแถวที่ไม่อยู่ในไฟล์ และไม่ใช่ transaction rollback จึงควรใช้ Staging ที่แยกและทิ้งได้

เซิร์ฟเวอร์ปฏิเสธโหมดซ้อมหากไม่ได้ระบุ environment เป็น `staging`, ผู้ใช้ไม่ใช่ Super Admin, ไฟล์ไม่มีรหัสโปรเจกต์ต้นทาง หรือโปรเจกต์ต้นทางตรงกับปลายทาง การตั้งตัวแปรนี้บน Production ไม่ได้ทำให้ Production ปลอดภัยขึ้น—อย่าตั้งค่านี้บน Production

หากเคยตั้งค่า Google Drive backup ด้วยตนเองใน Render ให้ลบ `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, `GOOGLE_DRIVE_REFRESH_TOKEN`, `BACKUP_CRON_SECRET` และ `BACKUP_RETENTION_DAYS` ออกจาก Environment และยกเลิก Scheduled Job ภายนอกที่เคยเรียก `/api/backup/cron` โค้ดนี้จะไม่ลบไฟล์สำรองเดิมที่อยู่ใน Google Drive

หลังเข้าสู่ระบบ แอปจะโหลดและบันทึกข้อมูลนักเรียน รายวิชา คะแนน การเข้าเรียน ใบแจ้งหนี้ และประกาศของโรงเรียนที่บัญชีมีสิทธิ์ใช้งานโดยอัตโนมัติ หากตั้งค่า RLS หรือโปรไฟล์ไม่ครบ แอปจะแสดงข้อผิดพลาดและไม่ใช้ข้อมูลจำลองแทน

> บทเรียน LMS และความคืบหน้าการเรียนใช้ migration `20261120_school_lms_lessons.sql`; ครูและผู้ดูแลเพิ่ม/แก้ไขบทเรียนได้ และนักเรียนบันทึกสถานะเรียนจบได้ เกม รายละเอียดโปรไฟล์เพิ่มเติม และข้อมูลอื่นที่ไม่มีตารางใน schema นี้ยังไม่ถูก persist ลง Supabase งานที่สั่ง/ส่งการบ้านใช้ migration `20261120_teacher_homework_workflow.sql` และแฟ้มผลงาน/พฤติกรรม/SDQ/ห้องพยาบาลใช้ migration `20261120_school_student_records.sql` ส่วนการชำระเงินจริงและ LINE OA ยังไม่เชื่อมต่อ ระบบจะไม่ทำเครื่องหมายว่าชำระเงินหรือส่งข้อความสำเร็จหากยังไม่ได้เชื่อมผู้ให้บริการจริง
