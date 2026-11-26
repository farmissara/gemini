# EduVerse - School Information & Learning Management System (SIS / LMS)

EduVerse is a modern, high-performance School Information System and Learning Management System designed for bilingual (Thai & English) academic institutions.

## Features

- **Student Information System (SIS)**: Bilingual student profiles (Thai & English names, national citizen ID, academic year, classroom/program).
- **Turnstile Gate Attendance & QR Scanner**: Real-time camera viewfinder simulation, barcode/QR check-in with status logging (Present, Late, Sick, Leave).
- **LINE Official Account (OA) & Messaging Workflows**:
  - Parent notification and broadcast workflows; live delivery requires a configured provider connection.
  - Tuition reminders can link to invoice and PromptPay information; the app is not a payment processor.
- **Academic Gradebook & Thai MOE Transcripts**:
  - Continuous assessment grading (Midterm, Final, Homework, Quiz).
  - Thai Ministry of Education 8-point GPA standard (A, B+, B, C+, C, D+, D, F).
  - Official bilingual transcript generation (ปพ.1) ready for PDF printing with Sarabun font styling.
- **Tuition & Invoice Tools**:
  - Itemized fee statements.
  - Thai PromptPay QR generation and transfer reference capture.
  - Real payment settlement/verification requires a connected payment provider.
- **Interactive Multi-Role Switching**: Toggle between Administrator, Teacher, Student, and Parent views seamlessly.
- **System Diagnostics & Architecture**: Live health indicators for LINE Messaging API, Supabase Database, Redis caching, Resend email, and encrypted local backup files.

## Development

```bash
npm install
npm run dev
```

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`) in `.env.local` before signing in. The server uses the same public Supabase credentials to verify sessions on AI endpoints; set `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the server in production, or provide the corresponding `VITE_` variables. Set `REDIS_REST_URL` and `REDIS_REST_TOKEN` on the production server for shared AI rate limiting; local development falls back to an in-memory limit. The ordered SQL migrations in [`supabase/migrations/`](./supabase/migrations/) are the database source of truth; CI checks them against a fresh local Supabase database. See [`DEPLOY_SUPABASE_RENDER.md`](./DEPLOY_SUPABASE_RENDER.md) for safe setup and existing-project migration guidance. Schools can register separate tenants from the sign-up screen; the first registrant becomes that school's administrator and the tenant activates after email confirmation. The browser uses only the public anon/publishable key; never put a `service_role` key in frontend configuration.

### Local Supabase development

Use the isolated local project to test without sending app queries to the hosted project. Start Docker Desktop, then run `npm run supabase:local:start` once to apply the local schema and fictional seed records. Run `npm run dev:local` to launch the app against the local API; this command reads the local API URL/key from the CLI and overrides any hosted credentials in `.env.local` for that process only. Local Auth is separate, so create a test account through the sign-up screen. The local project has no hosted-project link. `npm run supabase:local:reset` recreates its local database and seed data; it does not modify the hosted project.

The persistence scope and known limitations are documented in the [data persistence matrix](./docs/data-persistence.md). Other modules and third-party integrations are not automatically production-backed just because they appear in the UI.

### Per-school Gemini AI credentials

Apply [`20261123000005_school_ai_key_vault_and_quotas.sql`](./supabase/migrations/20261123000005_school_ai_key_vault_and_quotas.sql) before enabling per-school Gemini AI. Set `SCHOOL_AI_ENCRYPTION_KEY` in Render to a persistent 32-byte secret generated with `openssl rand -hex 32`; keep a protected copy and do not rotate it unless every saved school key is re-encrypted. School admins then enter their own Google AI Studio API key in System Settings → Packages and AI. Keys are AES-256-GCM encrypted in the database and never returned to the browser after saving. The monthly limit counts AI requests (10–20,000); Google bills the Google project that owns each key, so the in-app request quota is not a currency spending cap. AI keys are intentionally excluded from backups and must be entered again after restore or migration.

Built with React 19, TypeScript, Tailwind CSS v4, Lucide Icons, and Vite.
