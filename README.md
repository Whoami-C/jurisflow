# JurisFlow

CRM jurídico local desenvolvido com fidelidade ao plano de estágio em Engenharia de Dados.

## Tecnologias

- Frontend: Next.js, React e TypeScript.
- Backend: NestJS e TypeScript.
- Persistência: PostgreSQL 17 e Prisma ORM.
- Segurança: autenticação JWT, senhas com bcrypt, RBAC, Helmet e validação de entrada.
- Qualidade: Jest, Supertest, ESLint, build automatizado e CI com PostgreSQL.

O sistema não depende de hospedagem externa. O PostgreSQL é iniciado localmente pelo próprio projeto e seus arquivos ficam em `.local/postgres`.

## Abrir no Windows

Dê dois cliques em `ABRIR_JURISFLOW_LOCAL.bat`.

Na primeira execução, o iniciador prepara o PostgreSQL, aplica as migrations, cria os usuários e abre `http://localhost:3000`. Mantenha a janela aberta enquanto estiver usando o sistema.

Usuário administrador inicial:

- E-mail: `admin@jurisflow.local`
- Senha: `JurisFlow@2026`

Também são criados um perfil de advogado e um perfil de assistente. Consulte `prisma/seed.ts` para as credenciais locais de desenvolvimento.

## Comandos

- `npm run local`: inicia banco, migrations, seed, API e interface.
- `npm run dev`: inicia interface e API quando o PostgreSQL já está ativo.
- `npm run db:start`: inicia somente o PostgreSQL local.
- `npm run db:migrate:dev`: cria uma migration durante o desenvolvimento.
- `npm run db:backup`: exporta um backup JSON em `backups/`.
- `npm run check`: executa lint, testes unitários e builds.
- `npm run test:e2e`: executa testes de integração contra o PostgreSQL.

Leia `docs/arquitetura.md`, `docs/data-dictionary.md` e `docs/runbook.md` antes de alterar o modelo ou operar dados reais.
