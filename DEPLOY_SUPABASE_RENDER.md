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

หากต้องการเปิดใช้คิวอนุมัติการสมัครโรงเรียนในหน้า Super Admin ให้รัน `supabase/super_admin_registration_approval_migration.sql` เพิ่มใน SQL Editor ด้วย Migration นี้จำกัดสิทธิ์แก้ไขโปรไฟล์ไม่ให้ผู้ใช้เปลี่ยน role/สถานะของตนเอง และสร้าง RPC ที่ตรวจ role `super_admin` ฝั่งฐานข้อมูลก่อนอ่านหรืออนุมัติคำขอ

> สำรองฐานข้อมูลก่อนรันกับโปรเจกต์ที่มีข้อมูลอยู่แล้ว Schema นี้จะลบนโยบาย `Public ... access` แบบเดิม และแทนด้วยนโยบายที่ต้องมีบัญชี Supabase Auth และโปรไฟล์ที่กำหนดโรงเรียน/บทบาทไว้ การเข้าถึงข้อมูลเดิมผ่าน anon key จะถูกปฏิเสธจนกว่าจะ provision บัญชี

### 1.3 เปิดสมัครโรงเรียนและบัญชีผู้ใช้
1. ใน Supabase ไปที่ **Authentication → Providers → Email** และเปิดการยืนยันอีเมล (Confirm email) เพื่อให้ระบบเปิดใช้งานโรงเรียนใหม่หลังยืนยันแล้ว ตรวจสอบ **Authentication → URL Configuration** ให้ Site URL และ Redirect URLs อนุญาต URL ของแอป
2. ในหน้า EduVerse เลือก **สมัครสมาชิก → ลงทะเบียนโรงเรียน** กรอกชื่อโรงเรียน, ประเภท, จังหวัด, ชื่อผู้ดูแล, อีเมล และรหัสผ่าน โรงเรียนจำนวนมากสามารถสมัครแยก tenant ได้ โดยไม่ต้องเพิ่มข้อมูลโรงเรียนล่วงหน้า
3. ระบบสร้างโรงเรียนและบัญชี `admin` แยกกันในฐานข้อมูล; รหัสโรงเรียนและ slug สร้างให้อัตโนมัติ สถานะเริ่มต้นเป็น `pending` และจะเปลี่ยนเป็น `active` พร้อมบัญชีผู้ดูแลเมื่อ Supabase ยืนยันอีเมลสำเร็จ หากอีเมลยืนยันมีปัญหา Super Admin เข้า **ศูนย์ควบคุมระบบ → อนุมัติการสมัครโรงเรียน** เพื่อตรวจสอบและอนุมัติด้วยตนเองได้ โดยระบบจะยืนยันอีเมลให้ด้วยหากยังไม่ยืนยัน
4. การอนุมัติด้วยตนเองเป็นการข้ามการพิสูจน์ว่าเจ้าของบัญชีเข้าถึงอีเมลนั้นได้ ต้องตรวจสอบตัวตนผู้สมัครผ่านช่องทางอื่นก่อนทุกครั้ง ระบบบันทึกผู้อนุมัติ เวลา และวิธีอนุมัติไว้ในข้อมูลโรงเรียน คำขอที่แสดงในคิวนี้คือการสมัครโรงเรียน/ผู้ดูแลโรงเรียนใหม่ ไม่ใช่การอนุมัติบัญชีนักเรียน
5. ผู้สมัครทั่วไปที่เลือก **สมัครนักเรียน** ต้องเลือกโรงเรียนที่ active อยู่แล้ว บัญชีจะมีสถานะ `pending`; ผู้ดูแลโรงเรียนต้องตรวจสอบและเชื่อมกับระเบียนนักเรียนก่อนอนุมัติ:

   ```sql
   UPDATE public.user_profiles p
   SET status = 'active', student_id = s.id
   FROM auth.users u
   JOIN public.students s
     ON s.school_id = '<school-id>' AND s.student_id_number = '<student-number>'
   WHERE p.id = u.id AND u.email = 'student@example.com' AND p.role = 'student';
   ```

6. บัญชีครู/ผู้ปกครองของโรงเรียนที่มีอยู่แล้วต้องสร้างโดยผู้ดูแลผ่าน Supabase Dashboard หรือช่องทางที่เชื่อถือได้ และกำหนด role ผ่าน SQL Editor เท่านั้น ตัวอย่างกำหนดผู้ดูแลเพิ่มเติม:

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
8. Render จะเริ่มรัน `npm run build` และเผยแพร่เว็บของคุณให้พร้อมใช้งานภายใน 1-2 นาที จะได้ URL เช่น `https://eduverse-school.onrender.com`

---

## ส่วนที่ 3: ตั้งค่าแอปและการบันทึกข้อมูล

ตั้งค่า `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ใน environment ของ Render และไฟล์ `.env.local` สำหรับพัฒนาในเครื่อง ห้ามนำ `service_role` key หรือรหัสผ่านฐานข้อมูลมาใส่ใน `VITE_*` หรือ frontend

หลังเข้าสู่ระบบ แอปจะโหลดและบันทึกข้อมูลนักเรียน รายวิชา คะแนน การเข้าเรียน ใบแจ้งหนี้ และประกาศของโรงเรียนที่บัญชีมีสิทธิ์ใช้งานโดยอัตโนมัติ หากตั้งค่า RLS หรือโปรไฟล์ไม่ครบ แอปจะแสดงข้อผิดพลาดและไม่ใช้ข้อมูลจำลองแทน

> ฟีเจอร์ LMS, พอร์ตโฟลิโอ, ตารางเรียน, พฤติกรรม, ห้องพยาบาล, เกม, รายละเอียดโปรไฟล์เพิ่มเติม และข้อมูลอื่นที่ไม่มีตารางใน schema นี้ยังไม่ถูก persist ลง Supabase ส่วนการชำระเงินจริงและ LINE OA ยังไม่เชื่อมต่อ ระบบจะไม่ทำเครื่องหมายว่าชำระเงินหรือส่งข้อความสำเร็จหากยังไม่ได้เชื่อมผู้ให้บริการจริง
