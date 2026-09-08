# Dicionário de dados

## Entidades principais

- `clients`: pessoas físicas e jurídicas atendidas; CPF/CNPJ é único por proprietário.
- `leads`: oportunidades de novos clientes, origem, área de interesse, etapa comercial e próxima ação.
- `matters`: processos jurídicos vinculados a clientes, com número CNJ, área, polo, tribunal, etapa e situação.
- `tasks`: prazos, audiências, reuniões, petições e diligências vinculáveis a processos.
- `import_jobs`: histórico e resultado das importações de CSV.
- `audit_logs`: registro de criação, movimentação, importação e exclusão de dados.

Todos os registros operacionais possuem `owner_id`. As consultas e alterações sempre filtram esse identificador no servidor.

## Regras de qualidade

- Nome é obrigatório para clientes e oportunidades.
- Título e data ISO são obrigatórios para tarefas.
- E-mails são validados antes da persistência.
- CPF/CNPJ e número de processo não podem se repetir para o mesmo proprietário.
- A importação aceita no máximo 500 linhas por arquivo e identifica duplicidades internas.
- Exclusões e alterações de etapa são registradas na auditoria.
