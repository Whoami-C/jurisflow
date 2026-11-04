import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const databaseDir = join(process.cwd(), '.local', 'postgres');
mkdirSync(join(process.cwd(), '.local'), { recursive: true });
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'postgres',
  password: 'jurisflow_local',
  port: 5433,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

if (!existsSync(join(databaseDir, 'PG_VERSION'))) await postgres.initialise();
await postgres.start();
try {
  await postgres.createDatabase('jurisflow');
} catch (error) {
  if (!String(error).toLowerCase().includes('already exists')) throw error;
}
console.log('PostgreSQL local disponível na porta 5433.');

const stop = async () => {
  await postgres.stop();
  process.exit(0);
};
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
await new Promise(() => {});
