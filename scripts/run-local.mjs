import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import process from 'node:process';
import EmbeddedPostgres from 'embedded-postgres';

const projectRoot = process.cwd();
const localDir = join(projectRoot, '.local');
const databaseDir = join(localDir, 'postgres');
const npmCli =
  process.env.npm_execpath ??
  join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const localEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:jurisflow_local@127.0.0.1:5433/jurisflow?schema=public',
  JWT_SECRET:
    process.env.JWT_SECRET ??
    'jurisflow-local-development-secret-change-before-production',
  PORT: process.env.PORT ?? '3001',
  WEB_ORIGIN: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
};

mkdirSync(localDir, { recursive: true });

const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'jurisflow_local',
  port: 5433,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (message) => {
    if (String(message).includes('ready to accept connections')) {
      console.log('PostgreSQL local pronto.');
    }
  },
});

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: localEnv,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${command} terminou com código ${code}`)),
    );
  });
}

async function waitFor(url, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    const child = spawn('powershell.exe', ['-NoProfile', '-Command', `Start-Process '${url}'`], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  }
}

let appProcess;
let stopping = false;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\nEncerrando o JurisFlow local...');
  if (appProcess && !appProcess.killed) appProcess.kill('SIGTERM');
  try {
    await postgres.stop();
  } catch {}
  process.exit(code);
}

process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));

try {
  if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
    console.log('Criando a instância PostgreSQL local...');
    await postgres.initialise();
  }
  await postgres.start();
  try {
    await postgres.createDatabase('jurisflow');
  } catch (error) {
    if (!String(error).toLowerCase().includes('already exists')) throw error;
  }

  console.log('Aplicando migrations do Prisma...');
  await run(process.execPath, [npmCli, 'run', 'db:migrate']);
  await run(process.execPath, [npmCli, 'run', 'db:seed']);

  appProcess = spawn(process.execPath, [npmCli, 'run', 'dev'], {
    cwd: projectRoot,
    env: localEnv,
    stdio: 'inherit',
  });
  appProcess.once('exit', (code) => void shutdown(code ?? 0));

  const ready = await waitFor('http://localhost:3001/api/health');
  if (!ready) throw new Error('A API não ficou pronta no tempo esperado.');
  if (!(await waitFor('http://localhost:3000/'))) {
    throw new Error('A interface não ficou pronta no tempo esperado.');
  }
  console.log('\nJurisFlow disponível em http://localhost:3000/');
  console.log('Mantenha esta janela aberta. Use Ctrl+C para encerrar.\n');
  openBrowser('http://localhost:3000/');
} catch (error) {
  console.error('Não foi possível iniciar o JurisFlow:', error);
  await shutdown(1);
}
