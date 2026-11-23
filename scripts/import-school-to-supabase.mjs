import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_EXPORT = 'supabase-local/import/school-export.csv';
const MIGRATION_ENV = '.env.migrate.local';
const TABLE_ORDER = ['schools', 'students', 'teachers', 'courses', 'school_period_times', 'timetable_slots'];

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
        return [key, value];
      }),
  );
}

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
  if (rows.length < 2) throw new Error('Export CSV has no records.');
  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, '').trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ''])));
}

function readExport(file) {
  const grouped = new Map(TABLE_ORDER.map((table) => [table, []]));
  for (const entry of parseCsv(readFileSync(file, 'utf8'))) {
    const table = entry.table_name?.trim();
    if (!grouped.has(table)) throw new Error(`Unexpected table in export: ${table || '(empty)'}`);
    let record;
    try { record = JSON.parse(entry.record); }
    catch { throw new Error(`Could not parse a record from ${table}.`); }
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Invalid ${table} record.`);
    grouped.get(table).push(record);
  }
  const schools = grouped.get('schools');
  if (schools.length !== 1 || !schools[0].id) throw new Error('Expected exactly one source school with an ID.');
  // This points to an auth.users row in the source project. Auth users are not
  // included in this core-data export, so preserve approval history but detach
  // the old project's user UUID before importing into a different project.
  if (schools[0].approved_by) schools[0].approved_by = null;
  const schoolId = String(schools[0].id);
  if (!grouped.get('students').length) throw new Error('No students in export; import stopped.');
  for (const table of TABLE_ORDER.slice(1)) {
    for (const record of grouped.get(table)) {
      if (String(record.school_id ?? '') !== schoolId) {
        throw new Error(`A ${table} row does not belong to the exported school. Import stopped.`);
      }
    }
  }
  return { grouped, schoolId };
}

async function main() {
  const exportFile = resolve(process.argv.find((arg) => !arg.startsWith('--') && arg.endsWith('.csv')) || DEFAULT_EXPORT);
  const apply = process.argv.includes('--apply');
  const allowOverwrite = process.argv.includes('--allow-overwrite');
  if (!existsSync(exportFile)) throw new Error(`Export file not found: ${exportFile}`);

  const { grouped, schoolId } = readExport(exportFile);
  console.log(`Export validated for one school (${schoolId}).`);
  for (const table of TABLE_ORDER) console.log(`  ${table}: ${grouped.get(table).length} rows`);
  if (!apply) {
    console.log('\nDry run only. Add --apply after target schema and credentials are ready.');
    return;
  }

  const migrationEnv = readEnvFile(resolve(MIGRATION_ENV));
  const targetUrl = process.env.SUPABASE_TARGET_URL || migrationEnv.SUPABASE_TARGET_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || migrationEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!targetUrl || !serviceRoleKey) {
    throw new Error(`Set SUPABASE_TARGET_URL and SUPABASE_SERVICE_ROLE_KEY in ${MIGRATION_ENV} before applying.`);
  }

  const client = createClient(targetUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const table of TABLE_ORDER) {
    const { error } = await client.from(table).select('*').limit(0);
    if (error) throw new Error(`Target table ${table} is not ready: ${error.message}`);
  }
  const { data: existingSchool, error: lookupError } = await client
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .maybeSingle();
  if (lookupError) throw new Error(`Could not check the target school: ${lookupError.message}`);
  if (existingSchool && !allowOverwrite) {
    throw new Error('The target already has this school ID. Review it first; use --allow-overwrite only if you intend to upsert these exported records.');
  }

  console.log(`\nApplying upserts to ${new URL(targetUrl).host}. Existing target rows will not be deleted.`);
  for (const table of TABLE_ORDER) {
    const rows = grouped.get(table);
    if (!rows.length) continue;
    const { error } = await client.from(table).upsert(rows);
    if (error) throw new Error(`Import failed for ${table}: ${error.message}`);
    console.log(`Imported ${rows.length} ${table} rows.`);
  }
  console.log('Core school data import completed. Auth users, grades, attendance, and Storage files are not included in this six-table export.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
