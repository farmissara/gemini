import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

const dockerBin = '/Applications/Docker.app/Contents/Resources/bin';
const commandEnv = { ...process.env };
if (existsSync(join(dockerBin, 'docker'))) {
  commandEnv.PATH = `${dockerBin}${delimiter}${commandEnv.PATH || ''}`;
}

function readStatusValue(status, ...keys) {
  for (const key of keys) {
    if (typeof status[key] === 'string' && status[key].trim()) return status[key].trim();
  }
  return '';
}

let status;
try {
  const raw = execFileSync('npx', [
    'supabase', '--workdir', 'supabase-local', 'status', '-o', 'json',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], env: commandEnv });
  status = JSON.parse(raw);
} catch {
  console.error('Local Supabase is not running. Start Docker Desktop, then run `npm run supabase:local:start`.');
  process.exit(1);
}

const apiUrl = readStatusValue(status, 'API_URL', 'api_url', 'apiUrl');
const anonKey = readStatusValue(status, 'ANON_KEY', 'anon_key', 'anonKey');
if (!apiUrl || !anonKey) {
  console.error('Could not read the local Supabase API URL/key. Run `npm run supabase:local:status` and check the CLI output.');
  process.exit(1);
}

console.log(`Starting the app against local Supabase at ${apiUrl}; hosted credentials are not used.`);
const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  env: {
    ...commandEnv,
    VITE_SUPABASE_URL: apiUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
  },
});

child.on('error', (error) => {
  console.error(`Could not start the app: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
