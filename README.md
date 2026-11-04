# JurisFlow

CRM jurídico local para escritórios de advocacia. O JurisFlow centraliza clientes, processos, oportunidades e compromissos em uma interface única, com API própria, banco relacional e controle de acesso por perfil.

## Funcionalidades

- Cadastro, busca e atualização de clientes
- Gestão de processos e oportunidades vinculadas
- Agenda de prazos, audiências, reuniões e tarefas
- Painel com indicadores e próximos compromissos
- Importação estruturada de dados por CSV
- Autenticação, perfis de acesso e proteção de rotas
- Persistência local e backup dos dados

## Stack

Next.js, React e TypeScript no frontend. NestJS e TypeScript no backend. PostgreSQL 17 e Prisma ORM na persistência. JWT, bcrypt, RBAC, Helmet e validação de entrada na camada de segurança. Jest, Supertest e ESLint na qualidade.

## Requisitos

- Node.js 22.13 ou superior
- npm
- Windows, Linux ou macOS

## Instalação e execução

```bash
git clone https://github.com/Whoami-C/jurisflow.git
cd jurisflow
npm install
npm run local
```

A aplicação será aberta em `http://localhost:3000`. No Windows, também é possível executar `ABRIR_JURISFLOW_LOCAL.bat`.

Para desenvolvimento com os serviços separados:

```bash
npm run db:start
npm run dev
```

## Qualidade

```bash
npm run check
npm run test:e2e
```

Consulte [`docs/arquitetura.md`](docs/arquitetura.md), [`docs/data-dictionary.md`](docs/data-dictionary.md) e [`docs/runbook.md`](docs/runbook.md) para detalhes técnicos.
