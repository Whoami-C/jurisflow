import { PrismaClient } from '@prisma/client';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const prisma = new PrismaClient();
const backupDir = join(process.cwd(), 'backups');
await mkdir(backupDir, { recursive: true });

const data = {
  generatedAt: new Date().toISOString(),
  users: await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
  }),
  clients: await prisma.client.findMany(),
  opportunities: await prisma.opportunity.findMany(),
  matters: await prisma.matter.findMany(),
  tasks: await prisma.task.findMany(),
  imports: await prisma.importJob.findMany(),
  audit: await prisma.auditLog.findMany(),
};
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = join(backupDir, `jurisflow-${stamp}.json`);
await writeFile(output, JSON.stringify(data, null, 2), 'utf8');
await prisma.$disconnect();
console.log(`Backup criado em ${output}`);
