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
1. ในแถบเมนูด้านซ้ายของ Supabase Dashboard ให้คลิกที่ **SQL Editor** (ไอคอนรูป Terminal/Query)
2. คลิกปุ่ม **"+ New query"**
3. คัดลอกโค้ดจากไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ทั้งหมด
4. วางลงในช่องแก้ไขโค้ด แล้วกดปุ่มสีเขียว **"Run"**
5. Schema จะสร้างตารางหลัก, โปรไฟล์บัญชี, ความสัมพันธ์ผู้ปกครอง-นักเรียน, trigger สมัครโรงเรียน/นักเรียน และ Row Level Security (RLS) แบบแยกโรงเรียน/บทบาท

หากติดตั้ง schema รุ่นก่อนหน้านี้ไปแล้ว ให้นำ `supabase/register_school_signup_migration.sql` ไปรันเพื่ออัปเดตเฉพาะ trigger สมัครโรงเรียนและการเปิดใช้งานหลังยืนยันอีเมล ไม่จำเป็นต้องรัน schema ทั้งไฟล์ซ้ำ

หลังติดตั้ง schema ให้รัน migration ที่ต้องใช้กับระบบสอบและตารางเรียนตามลำดับ:

1. `supabase/migrations/20261111_central_exam_marketplace.sql`
2. `supabase/migrations/20261112_exam_audit_timetable.sql`

Migration ตารางเรียน/ตรวจสลิปสร้าง `school_exam_entitlements` ให้หากยังไม่มี แต่ควรรันหลัง schema หลักเพื่อให้ตารางโรงเรียน รายวิชา และฟังก์ชันตรวจ role พร้อมใช้งาน

3. รัน `supabase/migrations/20261112_school_logo_storage.sql` เพื่อให้ผู้ดูแลโรงเรียนอัปโหลดโลโก้ PNG, JPEG หรือ WebP (ไม่เกิน 2 MB) ไปยัง Supabase Storage ได้
4. สำหรับทั้งโปรเจกต์ใหม่และโปรเจกต์ที่มีอยู่ ให้นำ `supabase/migrations/20261113_secure_student_invites.sql` ไปรันใน SQL Editor หลัง schema เพื่อบังคับการสร้างบัญชีนักเรียนผ่านคำเชิญจากผู้ดูแลเท่านั้น
5. รัน `supabase/migrations/20261114_parent_private_push.sql` เพื่อเปิดกล่องแจ้งเตือนส่วนตัวและบันทึกอุปกรณ์ Push ของผู้ปกครอง
6. รัน `supabase/migrations/20261114_timetable_period_management.sql` เพื่ออนุญาตให้ผู้ดูแลลบคาบที่ไม่มีตารางสอนใช้งานได้
7. รัน `supabase/migrations/20261113_school_admin_flexibility.sql` เพื่อบันทึกค่าปีการศึกษา/ภาคเรียน ระบบเกรด รายการตำแหน่งบุคลากร และรายการห้องเรียนที่โรงเรียนกำหนดเอง
8. รัน `supabase/migrations/20261113_teacher_org_structure.sql` เพื่อเพิ่มการเชื่อมโยงผู้บังคับบัญชาในทะเบียนบุคลากร และเปิดใช้หน้าโครงสร้างองค์กร
9. รัน `supabase/migrations/20261116_production_readiness.sql` เพื่อเปิดใช้การเก็บข้อมูลใบลาออนไลน์, เช็คชื่อรายคาบ, หลักฐานสลิปโอนเงิน (`school-attachments` bucket), การล็อกอินด้วยรหัสนักเรียนผ่านลิงก์โรงเรียน และคำเชิญบัญชีครู/ผู้ปกครองจากหน้าเว็บ

หากต้องการเปิดใช้คิวอนุมัติการสมัครโรงเรียนในหน้า Super Admin ให้รัน `supabase/super_admin_registration_approval_migration.sql` เพิ่มใน SQL Editor ด้วย Migration นี้จำกัดสิทธิ์แก้ไขโปรไฟล์ไม่ให้ผู้ใช้เปลี่ยน role/สถานะของตนเอง และสร้าง RPC ที่ตรวจ role `super_admin` ฝั่งฐานข้อมูลก่อนอ่านหรืออนุมัติคำขอ

> สำรองฐานข้อมูลก่อนรันกับโปรเจกต์ที่มีข้อมูลอยู่แล้ว Schema นี้จะลบนโยบาย `Public ... access` แบบเดิม และแทนด้วยนโยบายที่ต้องมีบัญชี Supabase Auth และโปรไฟล์ที่กำหนดโรงเรียน/บทบาทไว้ การเข้าถึงข้อมูลเดิมผ่าน anon key จะถูกปฏิเสธจนกว่าจะ provision บัญชี

### 1.3 เปิดสมัครโรงเรียนและบัญชีผู้ใช้
1. ใน Supabase ไปที่ **Authentication → Providers → Email** และเปิดการยืนยันอีเมล (Confirm email) เพื่อให้ระบบเปิดใช้งานโรงเรียนใหม่หลังยืนยันแล้ว ตรวจสอบ **Authentication → URL Configuration** ให้ Site URL และ Redirect URLs อนุญาต URL ของแอป
2. ในหน้า EduVerse เลือก **สมัครสมาชิก → ลงทะเบียนโรงเรียน** กรอกชื่อโรงเรียน, ประเภท, จังหวัด, ชื่อผู้ดูแล, อีเมล และรหัสผ่าน โรงเรียนจำนวนมากสามารถสมัครแยก tenant ได้ โดยไม่ต้องเพิ่มข้อมูลโรงเรียนล่วงหน้า
3. ระบบสร้างโรงเรียนและบัญชี `admin` แยกกันในฐานข้อมูล; รหัสโรงเรียนและ slug สร้างให้อัตโนมัติ สถานะเริ่มต้นเป็น `pending` และจะเปลี่ยนเป็น `active` พร้อมบัญชีผู้ดูแลเมื่อ Supabase ยืนยันอีเมลสำเร็จ หากอีเมลยืนยันมีปัญหา Super Admin เข้า **ศูนย์ควบคุมระบบ → อนุมัติการสมัครโรงเรียน** เพื่อตรวจสอบและอนุมัติด้วยตนเองได้ โดยระบบจะยืนยันอีเมลให้ด้วยหากยังไม่ยืนยัน
4. การอนุมัติด้วยตนเองเป็นการข้ามการพิสูจน์ว่าเจ้าของบัญชีเข้าถึงอีเมลนั้นได้ ต้องตรวจสอบตัวตนผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง ระบบบันทึกผู้อนุมัติ เวลา และวิธีอนุมัติไว้ในข้อมูลโรงเรียน คำขอที่แสดงในคิวนี้คือการสมัครโรงเรียน/ผู้ดูแลโรงเรียนใหม่ ไม่ใช่การอนุมัติบัญชีนักเรียน
5. นักเรียนไม่สามารถสมัครบัญชีเองได้ ผู้ดูแลโรงเรียนต้องเพิ่มหรือนำเข้าระเบียนนักเรียนก่อน แล้วส่งคำเชิญจากหน้าจัดการนักเรียนไปยังอีเมลของนักเรียน ผู้รับใช้ลิงก์ในอีเมลเพื่อตั้งค่าบัญชี ระบบจะผูกบัญชีกับระเบียนนักเรียนที่ผู้ดูแลเลือกไว้ ห้ามใช้ SQL สมัครหรือผูกบัญชีนักเรียนด้วยตนเอง (สำหรับครูและผู้ปกครอง ผู้ดูแลสามารถกดเชิญจากหน้า **บุคลากรและครู** และ **นักเรียน** ได้โดยตรง)
6. Deploy Edge Function สำหรับส่งคำเชิญ โดยติดตั้ง Supabase CLI, เชื่อมโปรเจกต์ที่ถูกต้อง แล้วรัน:

   ```bash
   supabase link --project-ref <project-ref>
   supabase functions deploy invite-student
   supabase functions deploy invite-staff-parent
   supabase secrets set APP_SITE_URL=https://khaonangtuam-eduverse.onrender.com
   ```

   Function ใช้ `SUPABASE_URL`, `SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ฝั่งเซิร์ฟเวอร์ของ Supabase; ห้ามใส่ service-role key ใน frontend หรือ `VITE_*` secret `APP_SITE_URL` เป็น URL ของเว็บที่ต้องการให้ลิงก์เชิญกลับมา
7. บัญชีครู/ผู้ปกครองของโรงเรียนที่มีอยู่แล้วต้องสร้างโดยผู้ดูแลผ่าน Supabase Dashboard หรือช่องทางที่เชื่อถือได้ และกำหนด role ผ่าน SQL Editor เท่านั้น ตัวอย่างกำหนดผู้ดูแลเพิ่มเติม:

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

อีเมลยืนยันสมาชิกและลิงก์รีเซ็ตรหัสผ่านส่งผ่าน SMTP ของ Supabase ไม่ได้กำหนดผู้ส่งจากโค้ดหน้าเว็บ หากต้องการใช้ `farmissara@gmail.com`:

1. เปิดการยืนยันแบบ 2 ขั้นตอนในบัญชี Google แล้วสร้าง **Google App Password** สำหรับใช้กับ Supabase
2. ใน Supabase ไปที่ **Authentication → Emails → SMTP Settings** (ตำแหน่งเมนูอาจต่างกันตาม Dashboard) แล้วเปิดใช้งาน Custom SMTP
3. กรอกค่าเหล่านี้:
   - Host: `smtp.gmail.com`
   - Port: `465` (SSL) หรือ `587` (STARTTLS)
   - Username: `farmissara@gmail.com`
   - Sender email: `farmissara@gmail.com`
   - Sender name: ชื่อระบบที่ต้องการให้ผู้รับเห็น เช่น `EduVerse`
   - Password: Google App Password
4. บันทึกการตั้งค่าแล้วทดสอบสมัครบัญชีและส่งลิงก์ยืนยันใหม่ โดยใช้กล่องเมลที่ควบคุมได้ ตรวจโฟลเดอร์ Spam หากไม่พบอีเมล

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

Render.com ให้บริการโฮสต์เว็บประเภท **Static Site** ได้ฟรี เร็ว มี SSL Certificate (HTTPS) อัตโนมัติ

### 2.1 ตรวจสอบไฟล์ที่เตรียมไว้ในโปรเจกต์
ในโปรเจกต์นี้ได้จัดเตรียมไฟล์คอนฟิกสำหรับ Render.com ไว้เรียบร้อยแล้ว:
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
3. คลิกปุ่ม **"New +"** มุมขวาบน → เลือก **"Static Site"**
4. เชื่อมต่อบัญชี GitHub แล้วเลือก Repository ของคุณ (`farmissara/gemini`)
5. กำหนดการตั้งค่าในหน้าแบบฟอร์ม:
   - **Name**: `eduverse-school` (หรือชื่อที่คุณต้องการ)
   - **Branch**: `main`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
6. เลื่อนลงมาที่หัวข้อ **Advanced** หรือ **Environment Variables** แล้วกดปุ่ม **Add Environment Variable**:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-supabase-anon-key`
7. คลิกปุ่ม **"Create Static Site"**
8. Render จะเริ่มรัน `npm run build` และเผยแพร่เว็บของคุณให้พร้อมใช้งานภายใน 1-2 นาที จะได้ URL เช่น `https://khaonangtuam-eduverse.onrender.com`

---

## ส่วนที่ 3: ตั้งค่าแอปและการบันทึกข้อมูล

ตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ใน environment ของ Render และไฟล์ `.env.local` สำหรับพัฒนาในเครื่อง ห้ามนำ `service_role` key หรือรหัสผ่านฐานข้อมูลมาใส่ใน `VITE_*` หรือ frontend

หลังเข้าสู่ระบบ แอปจะโหลดและบันทึกข้อมูลนักเรียน รายวิชา คะแนน การเข้าเรียน ใบแจ้งหนี้ และประกาศของโรงเรียนที่บัญชีมีสิทธิ์ใช้งานโดยอัตโนมัติ หากตั้งค่า RLS หรือโปรไฟล์ไม่ครบ แอปจะแสดงข้อผิดพลาดและไม่ใช้ข้อมูลจำลองแทน

> ฟีเจอร์ LMS, พอร์ตโฟลิโอ, ตารางเรียน, พฤติกรรม, ห้องพยาบาล, เกม, รายละเอียดโปรไฟล์เพิ่มเติม และข้อมูลอื่นที่ไม่มีตารางใน schema นี้ยังไม่ถูก persist ลง Supabase ส่วนการชำระเงินจริงและ LINE OA ยังไม่เชื่อมต่อ ระบบจะไม่ทำเครื่องหมายว่าชำระเงินหรือส่งข้อความสำเร็จหากยังไม่ได้เชื่อมผู้ให้บริการจริง
