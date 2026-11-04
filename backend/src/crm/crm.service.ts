import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientKind,
  OpportunityStage,
  Prisma,
  Priority,
  Role,
  TaskStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma.service';
import { isValidCnj, isValidCpfCnpj, onlyDigits } from '../common/identifiers';
import {
  ClientDto,
  ImportClientsDto,
  MatterDto,
  OpportunityDto,
  SearchQueryDto,
  TaskDto,
} from './crm.dto';

const clientKindLabel: Record<ClientKind, string> = {
  INDIVIDUAL: 'Pessoa física',
  COMPANY: 'Pessoa jurídica',
};
const opportunityStageLabel: Record<OpportunityStage, string> = {
  NEW: 'Novo contato',
  QUALIFICATION: 'Consulta agendada',
  PROPOSAL: 'Proposta enviada',
  NEGOTIATION: 'Negociação',
  WON: 'Contratado',
  LOST: 'Não convertido',
};
const priorityLabel: Record<Priority, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private clean(value?: string | null) {
    const result = value?.trim();
    return result || null;
  }

  private async audit(
    user: AuthenticatedUser,
    action: string,
    entity: string,
    entityId?: string,
    details?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        entity,
        entityId,
        details,
      },
    });
  }

  private translateDatabaseError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Já existe um registro com esse identificador.');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException('Registro não encontrado.');
    }
    throw error;
  }

  private validateClientDocument(document?: string) {
    if (document && !isValidCpfCnpj(document)) {
      throw new BadRequestException('Informe um CPF ou CNPJ válido.');
    }
  }

  private normalizeDocument(document?: string) {
    return document ? onlyDigits(document) : null;
  }

  private validateMatterNumber(number?: string) {
    if (number && !isValidCnj(number)) {
      throw new BadRequestException('Informe um número CNJ válido.');
    }
  }

  async dashboard(query: SearchQueryDto, user: AuthenticatedUser) {
    const search = query.search?.trim() ?? '';
    const skip = (query.page - 1) * query.limit;
    const clientWhere: Prisma.ClientWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { document: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};
    const matterWhere: Prisma.MatterWhereInput = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { number: { contains: search, mode: 'insensitive' } },
            { client: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const [clients, leads, matters, tasks, imports, audit, users, counts] =
      await Promise.all([
        this.prisma.client.findMany({
          where: clientWhere,
          include: { _count: { select: { matters: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: query.limit,
        }),
        this.prisma.opportunity.findMany({
          include: { client: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
          take: 200,
        }),
        this.prisma.matter.findMany({
          where: matterWhere,
          include: { client: { select: { name: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: query.limit,
        }),
        this.prisma.task.findMany({
          include: {
            matter: { select: { title: true } },
            assignee: { select: { name: true } },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          take: 300,
        }),
        this.prisma.importJob.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        user.role === Role.ADMIN
          ? this.prisma.auditLog.findMany({
              include: { user: { select: { name: true } } },
              orderBy: { createdAt: 'desc' },
              take: 20,
            })
          : Promise.resolve([]),
        this.prisma.user.findMany({
          where: { active: true },
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: 'asc' },
        }),
        Promise.all([
          this.prisma.client.count({ where: clientWhere }),
          this.prisma.matter.count({ where: matterWhere }),
        ]),
      ]);

    return {
      clients: clients.map((client) => ({
        id: client.id,
        kind: clientKindLabel[client.kind],
        name: client.name,
        document: client.document,
        email: client.email,
        phone: client.phone,
        city: client.city,
        notes: client.notes,
        matter_count: client._count.matters,
      })),
      leads: leads.map((lead) => ({
        id: lead.id,
        client_id: lead.clientId,
        client_name: lead.client?.name,
        name: lead.name,
        contact: lead.contact,
        area: lead.area,
        source: lead.source,
        stage: opportunityStageLabel[lead.stage],
        estimated_value_cents: lead.estimatedValueCents,
        next_action: lead.nextAction,
      })),
      matters: matters.map((matter) => ({
        id: matter.id,
        client_id: matter.clientId,
        client_name: matter.client?.name,
        title: matter.title,
        number: matter.number,
        area: matter.area,
        court: matter.court,
        side: matter.side,
        stage: matter.stage,
        status: matter.status,
        value_cents: matter.valueCents,
        notes: matter.notes,
        updated_at: matter.updatedAt.toISOString(),
      })),
      tasks: tasks.map((task) => ({
        id: task.id,
        matter_id: task.matterId,
        matter_title: task.matter?.title,
        title: task.title,
        description: task.description,
        due_date: task.dueDate.toISOString().slice(0, 10),
        due_time: task.dueTime,
        type: task.type,
        priority: priorityLabel[task.priority],
        status: task.status.toLowerCase(),
        assignee: task.assignee?.name,
        completed_at: task.completedAt?.toISOString(),
      })),
      imports: imports.map((job) => ({
        id: job.id,
        file_name: job.fileName,
        imported_count: job.importedCount,
        rejected_count: job.rejectedCount,
        status: job.status,
        created_at: job.createdAt.toISOString(),
      })),
      audit: audit.map((entry) => ({
        id: entry.id,
        action: entry.action,
        entity: entry.entity,
        details:
          typeof entry.details === 'object' && entry.details
            ? JSON.stringify(entry.details)
            : undefined,
        user_name: entry.user?.name,
        created_at: entry.createdAt.toISOString(),
      })),
      users,
      pagination: {
        page: query.page,
        limit: query.limit,
        clients: counts[0],
        matters: counts[1],
      },
    };
  }

  async createClient(input: ClientDto, user: AuthenticatedUser) {
    this.validateClientDocument(input.document);
    try {
      const client = await this.prisma.client.create({
        data: {
          ...input,
          name: input.name.trim(),
          document: this.normalizeDocument(input.document),
          email: this.clean(input.email)?.toLowerCase(),
          phone: this.clean(input.phone),
          city: this.clean(input.city),
          notes: this.clean(input.notes),
        },
      });
      await this.audit(user, 'criou', 'cliente', client.id, { name: client.name });
      return client;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async updateClient(id: string, input: ClientDto, user: AuthenticatedUser) {
    this.validateClientDocument(input.document);
    try {
      const client = await this.prisma.client.update({
        where: { id },
        data: {
          ...input,
          name: input.name.trim(),
          document: this.normalizeDocument(input.document),
          email: this.clean(input.email)?.toLowerCase(),
          phone: this.clean(input.phone),
          city: this.clean(input.city),
          notes: this.clean(input.notes),
        },
      });
      await this.audit(user, 'editou', 'cliente', id, { name: client.name });
      return client;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async deleteClient(id: string, user: AuthenticatedUser) {
    try {
      await this.prisma.client.delete({ where: { id } });
      await this.audit(user, 'excluiu', 'cliente', id);
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async createOpportunity(input: OpportunityDto, user: AuthenticatedUser) {
    const lead = await this.prisma.opportunity.create({ data: input });
    await this.audit(user, 'criou', 'oportunidade', lead.id, { name: lead.name });
    return lead;
  }

  async updateOpportunity(
    id: string,
    input: OpportunityDto,
    user: AuthenticatedUser,
  ) {
    try {
      const lead = await this.prisma.opportunity.update({ where: { id }, data: input });
      await this.audit(user, 'editou', 'oportunidade', id, { name: lead.name });
      return lead;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async moveOpportunity(
    id: string,
    stage: OpportunityStage,
    user: AuthenticatedUser,
  ) {
    try {
      await this.prisma.opportunity.update({ where: { id }, data: { stage } });
      await this.audit(user, 'moveu', 'oportunidade', id, { stage });
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async deleteOpportunity(id: string, user: AuthenticatedUser) {
    try {
      await this.prisma.opportunity.delete({ where: { id } });
      await this.audit(user, 'excluiu', 'oportunidade', id);
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async createMatter(input: MatterDto, user: AuthenticatedUser) {
    this.validateMatterNumber(input.number);
    try {
      const matter = await this.prisma.matter.create({
        data: { ...input, number: this.clean(input.number) },
      });
      await this.audit(user, 'criou', 'processo', matter.id, { title: matter.title });
      return matter;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async updateMatter(id: string, input: MatterDto, user: AuthenticatedUser) {
    this.validateMatterNumber(input.number);
    try {
      const matter = await this.prisma.matter.update({
        where: { id },
        data: { ...input, number: this.clean(input.number) },
      });
      await this.audit(user, 'editou', 'processo', id, { title: matter.title });
      return matter;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async deleteMatter(id: string, user: AuthenticatedUser) {
    try {
      await this.prisma.matter.delete({ where: { id } });
      await this.audit(user, 'excluiu', 'processo', id);
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  private async resolveAssignee(value: string | undefined, fallbackId: string) {
    if (!value) return fallbackId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
    const user = await this.prisma.user.findFirst({
      where: {
        active: true,
        OR: [
          ...(isUuid ? [{ id: value }] : []),
          { email: { equals: value, mode: 'insensitive' } },
          { name: { equals: value, mode: 'insensitive' } },
        ],
      },
    });
    return user?.id ?? fallbackId;
  }

  async createTask(input: TaskDto, user: AuthenticatedUser) {
    const { assignee, dueDate, ...data } = input;
    const task = await this.prisma.task.create({
      data: {
        ...data,
        dueDate: new Date(`${dueDate}T12:00:00Z`),
        assigneeId: await this.resolveAssignee(assignee, user.id),
        completedAt: input.status === TaskStatus.DONE ? new Date() : null,
      },
    });
    await this.audit(user, 'criou', 'tarefa', task.id, { title: task.title });
    return task;
  }

  async updateTask(id: string, input: TaskDto, user: AuthenticatedUser) {
    const { assignee, dueDate, ...data } = input;
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: {
          ...data,
          dueDate: new Date(`${dueDate}T12:00:00Z`),
          assigneeId: await this.resolveAssignee(assignee, user.id),
          completedAt: input.status === TaskStatus.DONE ? new Date() : null,
        },
      });
      await this.audit(user, 'editou', 'tarefa', id, { title: task.title });
      return task;
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async moveTask(id: string, status: TaskStatus, user: AuthenticatedUser) {
    try {
      await this.prisma.task.update({
        where: { id },
        data: {
          status,
          completedAt: status === TaskStatus.DONE ? new Date() : null,
        },
      });
      await this.audit(user, 'moveu', 'tarefa', id, { status });
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  async deleteTask(id: string, user: AuthenticatedUser) {
    try {
      await this.prisma.task.delete({ where: { id } });
      await this.audit(user, 'excluiu', 'tarefa', id);
      return { ok: true };
    } catch (error) {
      this.translateDatabaseError(error);
    }
  }

  private async validateClientImport(input: ImportClientsDto) {
    const seen = new Set<string>();
    const errors: { line: number; message: string }[] = [];
    const documents = input.rows
      .map((row) => this.normalizeDocument(row.document))
      .filter((value): value is string => Boolean(value));
    const emails = input.rows
      .map((row) => this.clean(row.email)?.toLowerCase())
      .filter((value): value is string => Boolean(value));
    const existing = await this.prisma.client.findMany({
      where: {
        OR: [
          ...(documents.length ? [{ document: { in: documents } }] : []),
          ...(emails.length ? [{ email: { in: emails } }] : []),
        ],
      },
      select: { document: true, email: true },
    });
    const existingDocuments = new Set(existing.map((item) => item.document));
    const existingEmails = new Set(
      existing.map((item) => item.email?.toLowerCase()).filter(Boolean),
    );

    for (const [index, row] of input.rows.entries()) {
      const document = this.normalizeDocument(row.document);
      const email = this.clean(row.email)?.toLowerCase();
      const key = document || email || row.name.trim().toLowerCase();
      let message = '';
      if (!row.name.trim()) message = 'Nome obrigatório';
      else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        message = 'E-mail inválido';
      } else if (document && !isValidCpfCnpj(document)) {
        message = 'CPF/CNPJ inválido';
      } else if (seen.has(key)) message = 'Registro duplicado no arquivo';
      else if (document && existingDocuments.has(document)) {
        message = 'Documento já cadastrado';
      } else if (email && existingEmails.has(email)) {
        message = 'E-mail já cadastrado';
      } else if (
        (row.opportunitySource || row.opportunityValueCents) &&
        !row.opportunityArea
      ) {
        message = 'Área da oportunidade obrigatória';
      }
      seen.add(key);
      if (message) errors.push({ line: index + 2, message });
    }
    return { valid: input.rows.length - errors.length, errors };
  }

  async previewClientImport(input: ImportClientsDto) {
    return this.validateClientImport(input);
  }

  async importClients(input: ImportClientsDto, user: AuthenticatedUser) {
    const validation = await this.validateClientImport(input);
    const invalidLines = new Set(validation.errors.map((error) => error.line));
    const errors = [...validation.errors];
    let imported = 0;
    for (const [index, row] of input.rows.entries()) {
      if (invalidLines.has(index + 2)) continue;
      try {
        await this.prisma.$transaction(async (transaction) => {
          const client = await transaction.client.create({
            data: {
              kind: row.kind,
              name: row.name.trim(),
              document: this.normalizeDocument(row.document),
              email: this.clean(row.email)?.toLowerCase(),
              phone: this.clean(row.phone),
              city: this.clean(row.city),
            },
          });
          if (row.opportunityArea) {
            await transaction.opportunity.create({
              data: {
                clientId: client.id,
                name: client.name,
                contact: client.email || client.phone,
                area: row.opportunityArea,
                source: this.clean(row.opportunitySource),
                estimatedValueCents: row.opportunityValueCents ?? 0,
              },
            });
          }
        });
        imported += 1;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          errors.push({ line: index + 2, message: 'Documento já cadastrado' });
        } else {
          errors.push({ line: index + 2, message: 'Registro inválido' });
        }
      }
    }
    const job = await this.prisma.importJob.create({
      data: {
        fileName: input.fileName,
        entity: 'clientes',
        importedCount: imported,
        rejectedCount: errors.length,
        status: errors.length ? 'Concluído com alertas' : 'Concluído',
        errors,
      },
    });
    await this.audit(user, 'importou', 'clientes', job.id, {
      imported,
      rejected: errors.length,
    });
    return { imported, rejected: errors.length, errors };
  }

  async demo(user: AuthenticatedUser) {
    if ((await this.prisma.client.count()) > 0) {
      throw new ConflictException('A demonstração só pode ser criada em uma base vazia.');
    }
    const client = await this.prisma.client.create({
      data: {
        kind: ClientKind.INDIVIDUAL,
        name: 'Mariana Silva',
        document: '52998224725',
        email: 'mariana@example.com',
        phone: '(65) 99999-1234',
        city: 'Cuiabá',
        notes: 'Dados sintéticos para demonstração.',
      },
    });
    const matter = await this.prisma.matter.create({
      data: {
        clientId: client.id,
        title: 'Silva x Construtora Norte',
        number: '0001234-26.2026.8.11.0001',
        area: 'Cível',
        court: '1ª Vara Cível de Cuiabá',
        side: 'Requerente',
        stage: 'Contestação',
        status: 'Ativo',
        valueCents: 8_500_000,
        notes: 'Caso sintético para demonstração.',
      },
    });
    const due = new Date();
    due.setDate(due.getDate() + 2);
    await this.prisma.$transaction([
      this.prisma.opportunity.create({
        data: {
          name: 'Carlos Oliveira',
          contact: 'carlos@example.com',
          area: 'Trabalhista',
          source: 'Indicação',
          stage: OpportunityStage.QUALIFICATION,
          estimatedValueCents: 250_000,
          nextAction: 'Realizar consulta inicial',
        },
      }),
      this.prisma.task.create({
        data: {
          matterId: matter.id,
          title: 'Protocolar manifestação',
          description: 'Revisar anexos antes do protocolo.',
          dueDate: due,
          dueTime: '17:00',
          type: 'Prazo processual',
          priority: Priority.URGENT,
          status: TaskStatus.TODO,
          assigneeId: user.id,
        },
      }),
    ]);
    await this.audit(user, 'carregou', 'demonstração');
    return { ok: true };
  }

  async auditLog() {
    return this.prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async userSummary() {
    return this.prisma.user.groupBy({
      by: ['role'],
      where: { active: true },
      _count: { _all: true },
    });
  }
}
