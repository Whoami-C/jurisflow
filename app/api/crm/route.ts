import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getD1 } from '@/db/d1';
import {
  cleanText as clean,
  validEmail as emailOk,
  validIsoDate,
} from '@/lib/validation';

const allowedStatuses = ['todo', 'doing', 'review', 'done'];
const now = () => new Date().toISOString();
const json = (body: unknown, status = 200) => Response.json(body, { status });

async function context() {
  const user = await getChatGPTUser();
  return user ? { user, db: getD1() } : null;
}

async function log(
  db: D1Database,
  ownerId: string,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
) {
  await db
    .prepare(
      'INSERT INTO audit_logs (id, owner_id, action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      crypto.randomUUID(),
      ownerId,
      action,
      entity,
      entityId ?? null,
      details ?? null,
      now(),
    )
    .run();
}

export async function GET(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Não autenticado' }, 401);
  const search = clean(new URL(request.url).searchParams.get('search'), 120);
  const like = `%${search}%`;
  const [clients, leads, matters, tasks, imports, audit] = await ctx.db.batch([
    ctx.db
      .prepare(
        `SELECT c.*, (SELECT COUNT(*) FROM matters m WHERE m.client_id = c.id) matter_count FROM clients c WHERE c.owner_id = ? AND (? = '' OR c.name LIKE ? OR c.document LIKE ? OR c.email LIKE ?) ORDER BY c.updated_at DESC LIMIT 200`,
      )
      .bind(ctx.user.userId, search, like, like, like),
    ctx.db
      .prepare(
        'SELECT * FROM leads WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 200',
      )
      .bind(ctx.user.userId),
    ctx.db
      .prepare(
        `SELECT m.*, c.name client_name FROM matters m LEFT JOIN clients c ON c.id = m.client_id WHERE m.owner_id = ? AND (? = '' OR m.title LIKE ? OR m.number LIKE ? OR c.name LIKE ?) ORDER BY m.updated_at DESC LIMIT 200`,
      )
      .bind(ctx.user.userId, search, like, like, like),
    ctx.db
      .prepare(
        `SELECT t.*, m.title matter_title FROM tasks t LEFT JOIN matters m ON m.id = t.matter_id WHERE t.owner_id = ? ORDER BY t.due_date ASC, t.created_at DESC LIMIT 300`,
      )
      .bind(ctx.user.userId),
    ctx.db
      .prepare(
        'SELECT * FROM import_jobs WHERE owner_id = ? ORDER BY created_at DESC LIMIT 20',
      )
      .bind(ctx.user.userId),
    ctx.db
      .prepare(
        'SELECT * FROM audit_logs WHERE owner_id = ? ORDER BY created_at DESC LIMIT 12',
      )
      .bind(ctx.user.userId),
  ]);
  return json({
    clients: clients.results,
    leads: leads.results,
    matters: matters.results,
    tasks: tasks.results,
    imports: imports.results,
    audit: audit.results,
  });
}

export async function POST(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Não autenticado' }, 401);
  const body = (await request.json()) as Record<string, unknown>;
  const entity = clean(body.entity, 30);
  const timestamp = now();
  try {
    if (entity === 'client') {
      const name = clean(body.name, 160),
        email = clean(body.email, 160).toLowerCase(),
        document = clean(body.document, 30) || null;
      if (!name) return json({ error: 'Informe o nome do cliente.' }, 400);
      if (!emailOk(email))
        return json({ error: 'O e-mail informado é inválido.' }, 400);
      if (document) {
        const found = await ctx.db
          .prepare('SELECT id FROM clients WHERE owner_id = ? AND document = ?')
          .bind(ctx.user.userId, document)
          .first();
        if (found)
          return json(
            { error: 'Já existe um cliente com este CPF/CNPJ.' },
            409,
          );
      }
      const id = crypto.randomUUID();
      await ctx.db
        .prepare(
          'INSERT INTO clients (id, owner_id, kind, name, document, email, phone, city, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          ctx.user.userId,
          clean(body.kind, 30) || 'Pessoa física',
          name,
          document,
          email || null,
          clean(body.phone, 30) || null,
          clean(body.city, 80) || null,
          clean(body.notes, 1000) || null,
          timestamp,
          timestamp,
        )
        .run();
      await log(ctx.db, ctx.user.userId, 'criou', 'cliente', id, name);
      return json({ id }, 201);
    }
    if (entity === 'lead') {
      const name = clean(body.name, 160);
      if (!name)
        return json({ error: 'Informe o nome do potencial cliente.' }, 400);
      const id = crypto.randomUUID();
      await ctx.db
        .prepare(
          'INSERT INTO leads (id, owner_id, name, contact, area, source, stage, estimated_value_cents, next_action, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          ctx.user.userId,
          name,
          clean(body.contact, 160) || null,
          clean(body.area, 50) || 'Cível',
          clean(body.source, 80) || null,
          clean(body.stage, 40) || 'Novo contato',
          Math.max(0, Number(body.estimatedValueCents) || 0),
          clean(body.nextAction, 300) || null,
          timestamp,
          timestamp,
        )
        .run();
      await log(ctx.db, ctx.user.userId, 'criou', 'oportunidade', id, name);
      return json({ id }, 201);
    }
    if (entity === 'matter') {
      const title = clean(body.title, 180),
        number = clean(body.number, 40) || null;
      if (!title) return json({ error: 'Informe o título do processo.' }, 400);
      if (number) {
        const found = await ctx.db
          .prepare('SELECT id FROM matters WHERE owner_id = ? AND number = ?')
          .bind(ctx.user.userId, number)
          .first();
        if (found)
          return json(
            { error: 'Este número de processo já foi cadastrado.' },
            409,
          );
      }
      const id = crypto.randomUUID();
      await ctx.db
        .prepare(
          'INSERT INTO matters (id, owner_id, client_id, title, number, area, court, side, stage, status, value_cents, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          ctx.user.userId,
          clean(body.clientId, 50) || null,
          title,
          number,
          clean(body.area, 50) || 'Cível',
          clean(body.court, 160) || null,
          clean(body.side, 30) || null,
          clean(body.stage, 50) || 'Triagem',
          clean(body.status, 30) || 'Ativo',
          Math.max(0, Number(body.valueCents) || 0),
          clean(body.notes, 1500) || null,
          timestamp,
          timestamp,
        )
        .run();
      await log(ctx.db, ctx.user.userId, 'criou', 'processo', id, title);
      return json({ id }, 201);
    }
    if (entity === 'task') {
      const title = clean(body.title, 180),
        dueDate = clean(body.dueDate, 10),
        status = clean(body.status, 20) || 'todo';
      if (!title || !validIsoDate(dueDate))
        return json({ error: 'Informe o título e uma data válida.' }, 400);
      if (!allowedStatuses.includes(status))
        return json({ error: 'Etapa inválida.' }, 400);
      const id = crypto.randomUUID();
      await ctx.db
        .prepare(
          'INSERT INTO tasks (id, owner_id, matter_id, title, description, due_date, due_time, type, priority, status, assignee, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          id,
          ctx.user.userId,
          clean(body.matterId, 50) || null,
          title,
          clean(body.description, 1000) || null,
          dueDate,
          clean(body.dueTime, 5) || null,
          clean(body.type, 40) || 'Prazo',
          clean(body.priority, 20) || 'Normal',
          status,
          clean(body.assignee, 100) || ctx.user.displayName,
          status === 'done' ? timestamp : null,
          timestamp,
          timestamp,
        )
        .run();
      await log(ctx.db, ctx.user.userId, 'criou', 'tarefa', id, title);
      return json({ id }, 201);
    }
    if (entity === 'importClients') {
      const rows = Array.isArray(body.rows)
        ? (body.rows.slice(0, 500) as Record<string, unknown>[])
        : [];
      const valid: {
        id: string;
        name: string;
        kind: string;
        document: string | null;
        email: string | null;
        phone: string | null;
        city: string | null;
      }[] = [];
      const errors: { line: number; message: string }[] = [];
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        const name = clean(row.name, 160),
          document = clean(row.document, 30),
          email = clean(row.email, 160).toLowerCase();
        const key = document || email || name.toLowerCase();
        if (!name)
          errors.push({ line: index + 2, message: 'Nome obrigatório' });
        else if (!emailOk(email))
          errors.push({ line: index + 2, message: 'E-mail inválido' });
        else if (seen.has(key))
          errors.push({
            line: index + 2,
            message: 'Registro duplicado no arquivo',
          });
        else {
          seen.add(key);
          valid.push({
            id: crypto.randomUUID(),
            name,
            kind: clean(row.kind, 30) || 'Pessoa física',
            document: document || null,
            email: email || null,
            phone: clean(row.phone, 30) || null,
            city: clean(row.city, 80) || null,
          });
        }
      });
      const statements = valid.map((row) =>
        ctx.db
          .prepare(
            'INSERT OR IGNORE INTO clients (id, owner_id, kind, name, document, email, phone, city, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)',
          )
          .bind(
            row.id,
            ctx.user.userId,
            row.kind,
            row.name,
            row.document,
            row.email,
            row.phone,
            row.city,
            timestamp,
            timestamp,
          ),
      );
      if (statements.length) await ctx.db.batch(statements);
      const jobId = crypto.randomUUID();
      await ctx.db
        .prepare(
          'INSERT INTO import_jobs (id, owner_id, file_name, entity, imported_count, rejected_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          jobId,
          ctx.user.userId,
          clean(body.fileName, 180) || 'clientes.csv',
          'clientes',
          valid.length,
          errors.length,
          errors.length ? 'Concluído com alertas' : 'Concluído',
          timestamp,
        )
        .run();
      await log(
        ctx.db,
        ctx.user.userId,
        'importou',
        'clientes',
        jobId,
        `${valid.length} importados, ${errors.length} rejeitados`,
      );
      return json({ imported: valid.length, rejected: errors.length, errors });
    }
    if (entity === 'demo') {
      const existing = await ctx.db
        .prepare('SELECT COUNT(*) total FROM clients WHERE owner_id = ?')
        .bind(ctx.user.userId)
        .first<{ total: number }>();
      if ((existing?.total ?? 0) > 0)
        return json(
          { error: 'A demonstração só pode ser carregada em uma base vazia.' },
          409,
        );
      const clientId = crypto.randomUUID(),
        matterId = crypto.randomUUID(),
        due = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      await ctx.db.batch([
        ctx.db
          .prepare(
            'INSERT INTO clients (id, owner_id, kind, name, document, email, phone, city, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            clientId,
            ctx.user.userId,
            'Pessoa física',
            'Mariana Silva',
            '123.***.***-00',
            'mariana@example.com',
            '(65) 99999-1234',
            'Cuiabá',
            'Dados sintéticos para demonstração.',
            timestamp,
            timestamp,
          ),
        ctx.db
          .prepare(
            'INSERT INTO matters (id, owner_id, client_id, title, number, area, court, side, stage, status, value_cents, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            matterId,
            ctx.user.userId,
            clientId,
            'Silva x Construtora Norte',
            '0001234-56.2026.8.11.0001',
            'Cível',
            '1ª Vara Cível de Cuiabá',
            'Requerente',
            'Contestação',
            'Ativo',
            8500000,
            'Caso sintético para demonstração.',
            timestamp,
            timestamp,
          ),
        ctx.db
          .prepare(
            'INSERT INTO tasks (id, owner_id, matter_id, title, description, due_date, due_time, type, priority, status, assignee, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(
            crypto.randomUUID(),
            ctx.user.userId,
            matterId,
            'Protocolar manifestação',
            'Revisar anexos antes do protocolo.',
            due,
            '17:00',
            'Prazo processual',
            'Urgente',
            'todo',
            ctx.user.displayName,
            null,
            timestamp,
            timestamp,
          ),
      ]);
      await log(ctx.db, ctx.user.userId, 'carregou', 'demonstração');
      return json({ ok: true }, 201);
    }
    return json({ error: 'Operação não reconhecida.' }, 400);
  } catch (error) {
    console.error('crm_post_failed', { entity, error });
    return json(
      { error: 'Não foi possível salvar. Revise os dados e tente novamente.' },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Não autenticado' }, 401);
  const body = (await request.json()) as Record<string, unknown>;
  const id = clean(body.id, 50),
    status = clean(body.status, 20);
  if (!id || !allowedStatuses.includes(status))
    return json({ error: 'Dados inválidos.' }, 400);
  const timestamp = now();
  const result = await ctx.db
    .prepare(
      'UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
    )
    .bind(
      status,
      status === 'done' ? timestamp : null,
      timestamp,
      id,
      ctx.user.userId,
    )
    .run();
  if (!result.meta.changes)
    return json({ error: 'Tarefa não encontrada.' }, 404);
  await log(ctx.db, ctx.user.userId, 'moveu', 'tarefa', id, status);
  return json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await context();
  if (!ctx) return json({ error: 'Não autenticado' }, 401);
  const body = (await request.json()) as Record<string, unknown>;
  const entity = clean(body.entity, 20),
    id = clean(body.id, 50);
  const table =
    entity === 'client'
      ? 'clients'
      : entity === 'lead'
        ? 'leads'
        : entity === 'matter'
          ? 'matters'
          : entity === 'task'
            ? 'tasks'
            : '';
  if (!table || !id) return json({ error: 'Operação inválida.' }, 400);
  const result = await ctx.db
    .prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`)
    .bind(id, ctx.user.userId)
    .run();
  if (!result.meta.changes)
    return json({ error: 'Registro não encontrado.' }, 404);
  await log(ctx.db, ctx.user.userId, 'excluiu', entity, id);
  return json({ ok: true });
}
