# Runbook local

## Iniciar

1. Execute `ABRIR_JURISFLOW_LOCAL.bat`.
2. Aguarde PostgreSQL, migration, seed, API e frontend ficarem prontos.
3. Entre em `http://localhost:3000`.
4. Mantenha a janela aberta.

## Encerrar

Pressione `Ctrl+C` na janela do JurisFlow. O iniciador encerra a aplicação e o PostgreSQL, preservando os dados.

## Verificação

1. Execute `npm run check`.
2. Com o PostgreSQL ativo, execute `npm run test:e2e`.
3. Confirme `http://localhost:3001/api/health`.

## Backup

Com o PostgreSQL ativo, execute `npm run db:backup`. O arquivo JSON é criado em `backups/` e não deve ser enviado ao repositório.

## Incidente de dados

Interrompa novas importações, preserve a auditoria e gere um backup antes de qualquer correção. Documente data, responsável, registros afetados e justificativa.

## LGPD

Antes de usar dados reais, o escritório deve definir finalidade e base legal, responsáveis, retenção, atendimento aos titulares, resposta a incidentes e periodicidade de backup. Restrinja contas administrativas e troque as senhas iniciais.

## Checklist de aceite

- Login válido e rejeição de senha incorreta.
- Permissões diferentes entre administrador, advogado e assistente.
- Criação, edição, consulta e exclusão de entidades.
- Busca por cliente e processo.
- Movimentação de oportunidade e tarefa por arrastar.
- Pré-validação e importação parcial de CSV, incluindo oportunidade opcional.
- Registro das ações na auditoria.
- Persistência após fechar e abrir novamente.
