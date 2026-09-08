import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const clients = sqliteTable(
  'clients',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    kind: text('kind').notNull(),
    name: text('name').notNull(),
    document: text('document'),
    email: text('email'),
    phone: text('phone'),
    city: text('city'),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_clients_owner_name').on(table.ownerId, table.name),
    uniqueIndex('idx_clients_owner_document').on(table.ownerId, table.document),
  ],
);

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    name: text('name').notNull(),
    contact: text('contact'),
    area: text('area').notNull(),
    source: text('source'),
    stage: text('stage').notNull(),
    estimatedValueCents: integer('estimated_value_cents').notNull().default(0),
    nextAction: text('next_action'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('idx_leads_owner_stage').on(table.ownerId, table.stage)],
);

export const matters = sqliteTable(
  'matters',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    clientId: text('client_id').references(() => clients.id),
    title: text('title').notNull(),
    number: text('number'),
    area: text('area').notNull(),
    court: text('court'),
    side: text('side'),
    stage: text('stage').notNull(),
    status: text('status').notNull(),
    valueCents: integer('value_cents').notNull().default(0),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_matters_owner_status').on(table.ownerId, table.status),
    index('idx_matters_client_id').on(table.clientId),
    uniqueIndex('idx_matters_owner_number').on(table.ownerId, table.number),
  ],
);

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    matterId: text('matter_id').references(() => matters.id),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: text('due_date').notNull(),
    dueTime: text('due_time'),
    type: text('type').notNull(),
    priority: text('priority').notNull(),
    status: text('status').notNull(),
    assignee: text('assignee'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_tasks_owner_status').on(table.ownerId, table.status),
    index('idx_tasks_owner_due_date').on(table.ownerId, table.dueDate),
    index('idx_tasks_matter_id').on(table.matterId),
  ],
);

export const importJobs = sqliteTable(
  'import_jobs',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    fileName: text('file_name').notNull(),
    entity: text('entity').notNull(),
    importedCount: integer('imported_count').notNull().default(0),
    rejectedCount: integer('rejected_count').notNull().default(0),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_import_jobs_owner_created').on(table.ownerId, table.createdAt),
  ],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    details: text('details'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_audit_owner_created').on(table.ownerId, table.createdAt),
  ],
);
