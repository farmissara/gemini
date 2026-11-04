# EduVerse - School Information & Learning Management System (SIS / LMS)

EduVerse is a modern, high-performance School Information System and Learning Management System designed for bilingual (Thai & English) academic institutions.

## Features

- **Student Information System (SIS)**: Bilingual student profiles (Thai & English names, national citizen ID, academic year, classroom/program).
- **Turnstile Gate Attendance & QR Scanner**: Real-time camera viewfinder simulation, barcode/QR check-in with status logging (Present, Late, Sick, Leave).
- **LINE Official Account (OA) & Messaging Integration**:
  - Instant morning check-in push notifications to parents.
  - Tuition fee overdue reminders with direct PromptPay billing.
  - Multi-cast broadcast announcements to parents, students, or faculty.
- **Academic Gradebook & Thai MOE Transcripts**:
  - Continuous assessment grading (Midterm, Final, Homework, Quiz).
  - Thai Ministry of Education 8-point GPA standard (A, B+, B, C+, C, D+, D, F).
  - Official bilingual transcript generation (ปพ.1) ready for PDF printing with Sarabun font styling.
- **Tuition & Payment Invoicing**:
  - Itemized fee statements.
  - Thai PromptPay QR biller code generation.
  - Bank transfer and digital payment verification.
- **Interactive Multi-Role Switching**: Toggle between Administrator, Teacher, Student, and Parent views seamlessly.
- **System Diagnostics & Architecture**: Live health indicators for LINE Messaging API, Supabase Database, Redis caching, Resend email, and encrypted database snapshots.

## Development

```bash
npm install
npm run dev
```

Built with React 19, TypeScript, Tailwind CSS v4, Lucide Icons, and Vite.
