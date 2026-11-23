import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { spawn } from 'node:child_process';

const dockerBin = '/Applications/Docker.app/Contents/Resources/bin';
const env = { ...process.env };
if (existsSync(join(dockerBin, 'docker'))) {
  env.PATH = `${dockerBin}${delimiter}${env.PATH || ''}`;
}

const child = spawn('npx', [
  'supabase', '--workdir', 'supabase-local', ...process.argv.slice(2),
], { stdio: 'inherit', env });

child.on('error', (error) => {
  console.error(`Could not run local Supabase CLI: ${error.message}`);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
