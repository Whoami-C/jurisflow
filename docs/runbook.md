# Runbook do JurisFlow

## Verificação antes de publicar

1. Instalar dependências com `npm ci`.
2. Revisar as migrations em `drizzle/`.
3. Executar `npm run check`.
4. Confirmar que o binding `DB` está configurado.
5. Verificar autenticação, isolamento por usuário e trilha de auditoria.

## Importação CSV

O arquivo deve estar em UTF-8 e usar vírgula ou ponto e vírgula. Faça a pré-visualização, corrija registros sem nome ou com e-mail inválido e somente então confirme. Consulte o histórico para conferir quantos registros foram aceitos ou rejeitados.

## Segurança e LGPD

O sistema reduz exposição com autenticação, separação lógica por usuário, consultas preparadas e auditoria. O escritório ainda deve definir controlador, encarregado, base legal, política de retenção, resposta a incidentes e atendimento aos direitos dos titulares.

## Recuperação

Em caso de erro de dados, interrompa novas importações, preserve os registros de auditoria e restaure a última cópia válida do banco pela plataforma de hospedagem. Não execute alterações manuais sem registrar o motivo e o responsável.
