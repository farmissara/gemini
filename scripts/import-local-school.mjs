import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const LOCAL_SCHOOL_ID = 'local-demo-school';
const DEFAULT_FILE = 'supabase-local/import/school-export.csv';
const ALLOWED_TABLES = ['schools', 'students', 'teachers', 'courses', 'timetable_slots', 'school_period_times'];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      if (row.some((cell) => cell !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    if (row.some((cell) => cell !== '')) rows.push(row);
  }
  if (rows.length < 2) throw new Error('CSV has no exported records.');
  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
}

function getLocalCredentials() {
  const dockerBin = '/Applications/Docker.app/Contents/Resources/bin';
  const env = { ...process.env };
  if (existsSync(join(dockerBin, 'docker'))) env.PATH = `${dockerBin}${delimiter}${env.PATH || ''}`;
  const raw = execFileSync('npx', ['supabase', '--workdir', 'supabase-local', 'status', '-o', 'json'], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env,
  });
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('Local Supabase status returned invalid output.');
  const status = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  const url = status.API_URL || status.api_url || status.apiUrl;
  const key = status.SERVICE_ROLE_KEY || status.service_role_key;
  if (!url || !key) throw new Error('Could not read the local Supabase API URL and key.');
  return { url, key };
}

async function main() {
  const file = resolve(process.argv[2] || DEFAULT_FILE);
  if (!existsSync(file)) throw new Error(`Export file not found: ${file}`);
  const grouped = new Map(ALLOWED_TABLES.map((table) => [table, []]));
  for (const entry of parseCsv(readFileSync(file, 'utf8'))) {
    const table = entry.table_name?.trim();
    if (!grouped.has(table)) throw new Error(`Unexpected table in export: ${table || '(empty)'}`);
    let record;
    try { record = JSON.parse(entry.record); }
    catch { throw new Error(`Could not parse a JSON record from ${table}.`); }
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Invalid ${table} record.`);
    if (table === 'schools') {
      record.id = LOCAL_SCHOOL_ID;
      // Auth identities are intentionally not copied to this local database.
      if ('approved_by' in record) record.approved_by = null;
    }
    else record.school_id = LOCAL_SCHOOL_ID;
    grouped.get(table).push(record);
  }
  if (grouped.get('schools').length !== 1) throw new Error('Expected exactly one source school row.');
  if (!grouped.get('students').length) throw new Error('No students found; nothing imported.');

  const { url, key } = getLocalCredentials();
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of ALLOWED_TABLES) {
    const rows = grouped.get(table);
    if (!rows.length) continue;
    const { error } = await client.from(table).upsert(rows);
    if (error) throw new Error(`Local import failed for ${table}: ${error.message}`);
    console.log(`Imported ${rows.length} ${table} rows into Local.`);
  }
  console.log('Local school data import completed. Source Supabase was not modified.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
