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

### 1.2 ติดตั้งโครงสร้างฐานข้อมูล (SQL Schema & RLS)
1. ในแถบเมนูด้านซ้ายของ Supabase Dashboard ให้คลิกที่ **SQL Editor** (ไอคอนรูป Terminal/Query)
2. คลิกปุ่ม **"+ New query"**
3. คัดลอกโค้ดจากไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ทั้งหมด
4. วางลงในช่องแก้ไขโค้ด แล้วกดปุ่มสีเขียว **"Run"**
5. ระบบจะสร้าง 7 ตารางหลัก พร้อมสิทธิ์ความปลอดภัย Row Level Security (RLS) และ Indexes ได้แก่:
   - `schools` (ข้อมูลโรงเรียน/สาขา)
   - `students` (ทะเบียนประวัตินักเรียน)
   - `courses` (หลักสูตรและรายวิชา)
   - `grades` (ผลการเรียนและบันทึกคะแนน)
   - `attendance` (บันทึกการเช็คชื่อเข้าแถว/เข้าเรียน)
   - `invoices` (ใบแจ้งหนี้ค่าเทอม/พร้อมเพย์)
   - `announcements` (ข่าวสารประชาสัมพันธ์)

### 1.3 ดึงค่าการเชื่อมต่อ (API Credentials)
1. ไปที่ **Project Settings** (ไอคอนฟันเฟืองด้านล่างซ้าย) → เลือกแท็บ **API**
2. คัดลอกค่า 2 ตัวต่อไปนี้:
   - **Project URL** (เช่น `https://xxxxxx.supabase.co`)
   - **anon public key** (สตริงยาวๆ ขึ้นต้นด้วย `eyJhbGci...`)

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

## ส่วนที่ 3: การ Sync ข้อมูลและทดสอบในแอป EduVerse

ภายในตัวระบบ EduVerse คุณสามารถทดสอบและซิงค์ข้อมูลได้โดยตรง:
1. เข้าไปที่เมนูด้านซ้าย **"การเชื่อมต่อระบบ & สถาปัตยกรรม (System Architecture)"** หรือคลิกปุ่ม **"Supabase & Render"** บนแถบเมนูด้านบน
2. ใส่ Project URL และ Anon Key เพื่อทดสอบ Ping การเชื่อมต่อไปยัง Supabase ทันที
3. กดปุ่ม **"เริ่ม Sync ข้อมูลทั้งหมด"** เพื่อโคลนข้อมูลจำลองโรงเรียน, นักเรียน, รายวิชา, คะแนน, และการเช็คชื่อเข้า Supabase ของจริงได้ทันที!
