# Dicionário de dados

## Entidades

- `users`: usuários locais, senha em hash, papel e situação de acesso.
- `clients`: pessoas físicas e jurídicas; documento único.
- `opportunities`: potenciais clientes, vínculo opcional com cliente, origem, área, etapa, valor e próxima ação.
- `matters`: processos vinculáveis a clientes; número CNJ único.
- `tasks`: prazos, audiências, reuniões e tarefas vinculáveis a processo e responsável.
- `import_jobs`: resultado e erros de cada importação CSV.
- `audit_logs`: usuário, ação, entidade, registro, detalhes e instante.

## Relacionamentos

- Um cliente pode possuir vários processos.
- Um cliente pode possuir várias oportunidades.
- Um processo pode possuir várias tarefas.
- Um usuário pode ser responsável por várias tarefas.
- Um usuário pode gerar vários registros de auditoria.

## Domínios

- Papel: `ADMIN`, `LAWYER`, `ASSISTANT`.
- Tipo de cliente: `INDIVIDUAL`, `COMPANY`.
- Etapa da oportunidade: `NEW`, `QUALIFICATION`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`.
- Etapa da tarefa: `TODO`, `DOING`, `REVIEW`, `DONE`.
- Prioridade: `LOW`, `NORMAL`, `HIGH`, `URGENT`.

## Regras de qualidade

- Nomes e títulos são obrigatórios.
- E-mails devem possuir formato válido.
- CPF/CNPJ e número CNJ são validados antes da persistência.
- Documento e número CNJ não podem se repetir.
- Valores monetários são armazenados em centavos inteiros.
- Datas de tarefa usam data ISO.
- Importações aceitam até 500 linhas, validam antes da confirmação, rejeitam duplicidades e registram erros por linha.
- A importação pode criar, na mesma transação, o cliente e sua oportunidade opcional.
- Alterações e exclusões relevantes geram auditoria.
