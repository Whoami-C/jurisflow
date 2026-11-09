import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUser(name: string, email: string, role: Role, password: string) {
  const passwordHash = await hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, active: true, passwordHash },
    create: { name, email, role, passwordHash },
  });
}

async function main() {
  await upsertUser(
    'Administrador JurisFlow',
    process.env.SEED_ADMIN_EMAIL ?? 'admin@jurisflow.local',
    Role.ADMIN,
    process.env.SEED_ADMIN_PASSWORD ?? 'JurisFlow@2026',
  );
  await upsertUser(
    'Dra. Ana Martins',
    'advogada@jurisflow.local',
    Role.LAWYER,
    process.env.SEED_LAWYER_PASSWORD ?? 'Advogada@2026',
  );
  await upsertUser(
    'Assistente Jurídico',
    'assistente@jurisflow.local',
    Role.ASSISTANT,
    process.env.SEED_ASSISTANT_PASSWORD ?? 'Assistente@2026',
  );
}

main()
  .then(() => console.log('Usuários locais preparados.'))
  .finally(() => prisma.$disconnect());
