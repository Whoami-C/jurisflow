import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientDto, TaskDto } from './crm.dto';

describe('Regras de qualidade do CRM', () => {
  it('rejeita e-mail inválido de cliente', async () => {
    const input = plainToInstance(ClientDto, {
      kind: 'INDIVIDUAL',
      name: 'Cliente Teste',
      email: 'email-invalido',
    });
    const errors = await validate(input);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('aceita cliente com campos obrigatórios', async () => {
    const input = plainToInstance(ClientDto, {
      kind: 'COMPANY',
      name: 'Empresa Jurídica Ltda.',
      email: 'contato@empresa.test',
    });
    expect(await validate(input)).toHaveLength(0);
  });

  it('rejeita tarefa sem data ISO', async () => {
    const input = plainToInstance(TaskDto, {
      title: 'Protocolar recurso',
      dueDate: '10/09/2026',
      type: 'Prazo processual',
      priority: 'URGENT',
      status: 'TODO',
    });
    const errors = await validate(input);
    expect(errors.some((error) => error.property === 'dueDate')).toBe(true);
  });
});
