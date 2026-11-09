'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  Download,
  FileClock,
  FileText,
  LayoutDashboard,
  List,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Upload,
  UserRoundSearch,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Client = {
  id: string;
  kind: string;
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  city?: string;
  notes?: string;
  matter_count: number;
};
type Lead = {
  id: string;
  client_id?: string;
  client_name?: string;
  name: string;
  contact?: string;
  area: string;
  source?: string;
  stage: string;
  estimated_value_cents: number;
  next_action?: string;
};
type Matter = {
  id: string;
  client_id?: string;
  client_name?: string;
  title: string;
  number?: string;
  area: string;
  court?: string;
  side?: string;
  stage: string;
  status: string;
  value_cents: number;
  notes?: string;
  updated_at: string;
};
type Task = {
  id: string;
  matter_id?: string;
  matter_title?: string;
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  type: string;
  priority: string;
  status: string;
  assignee?: string;
  completed_at?: string;
};
type ImportJob = {
  id: string;
  file_name: string;
  imported_count: number;
  rejected_count: number;
  status: string;
  created_at: string;
};
type Audit = {
  id: string;
  action: string;
  entity: string;
  details?: string;
  created_at: string;
};
type CrmUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'LAWYER' | 'ASSISTANT';
};
type Data = {
  clients: Client[];
  leads: Lead[];
  matters: Matter[];
  tasks: Task[];
  imports: ImportJob[];
  audit: Audit[];
  users: CrmUser[];
};
type Page =
  | 'dashboard'
  | 'leads'
  | 'clients'
  | 'matters'
  | 'tasks'
  | 'imports'
  | 'audit';
type FormType = 'client' | 'lead' | 'matter' | 'task' | null;
type CsvRow = {
  name: string;
  kind: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  opportunityArea: string;
  opportunitySource: string;
  opportunityValueCents: string;
};
type CsvPreview = {
  valid: number;
  errors: { line: number; message: string }[];
};
const emptyData: Data = {
  clients: [],
  leads: [],
  matters: [],
  tasks: [],
  imports: [],
  audit: [],
  users: [],
};
const columns = [
  { id: 'todo', label: 'A fazer', tone: 'slate' },
  { id: 'doing', label: 'Em andamento', tone: 'blue-dot' },
  { id: 'review', label: 'Em revisão', tone: 'amber-dot' },
  { id: 'done', label: 'Concluído', tone: 'green-dot' },
];
const nav = [
  ['dashboard', 'Visão geral', LayoutDashboard],
  ['leads', 'Oportunidades', UserRoundSearch],
  ['clients', 'Clientes', Users],
  ['matters', 'Processos', BriefcaseBusiness],
  ['tasks', 'Prazos e tarefas', CalendarDays],
  ['imports', 'Importações', Upload],
  ['audit', 'Auditoria', ShieldCheck],
] as const;
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(`${value.slice(0, 10)}T12:00:00`))
    .replace('.', '');
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((v) => v[0])
    .join('')
    .toUpperCase();
const daysUntil = (date: string) =>
  Math.ceil(
    (new Date(`${date}T23:59:59`).getTime() - new Date().getTime()) / 86400000,
  );
const normalizeSearch = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}@.]+/gu, ' ')
    .trim();
const matchesSearch = (value: unknown, query: string) => {
  const text = normalizeSearch(value);
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term));
};

const parseDelimitedLine = (line: string, separator: string) => {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === separator && !quoted) {
      values.push(current.trim());
      current = '';
    } else current += character;
  }
  values.push(current.trim());
  return values;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const entityPath: Record<Exclude<FormType, null>, string> = {
  client: 'clients',
  lead: 'opportunities',
  matter: 'matters',
  task: 'tasks',
};
const clientKindToApi: Record<string, string> = {
  'Pessoa física': 'INDIVIDUAL',
  'Pessoa jurídica': 'COMPANY',
};
const stageToApi: Record<string, string> = {
  'Novo contato': 'NEW',
  'Consulta agendada': 'QUALIFICATION',
  'Proposta enviada': 'PROPOSAL',
  Negociação: 'NEGOTIATION',
  Contratado: 'WON',
  'Não convertido': 'LOST',
};
const priorityToApi: Record<string, string> = {
  Baixa: 'LOW',
  Normal: 'NORMAL',
  Alta: 'HIGH',
  Urgente: 'URGENT',
};

export function CrmApp({
  user,
  token,
  onLogout,
}: {
  user: CrmUser;
  token: string;
  onLogout: () => void;
}) {
  const [data, setData] = useState<Data>(emptyData);
  const [page, setPage] = useState<Page>('dashboard');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [formType, setFormType] = useState<FormType>(null);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<{
    entity: string;
    id: string;
    label: string;
  } | null>(null);
  const [view, setView] = useState('kanban');
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvName, setCsvName] = useState('');
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [dragging, setDragging] = useState('');
  const load = useCallback(
    async (q = '') => {
      setLoading(true);
      try {
        const res = await fetch(
          `${apiUrl}/crm${q ? `?search=${encodeURIComponent(q)}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.status === 401) {
          onLogout();
          return;
        }
        const body = (await res.json()) as Data & { message?: string };
        if (!res.ok) throw new Error(body.message || 'Falha ao carregar.');
        setData(body);
      } catch {
        setFeedback('Não foi possível carregar os dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    },
    [onLogout, token],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const notify = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 3500);
  };
  const request = async (
    path: string,
    method: string,
    body?: unknown,
  ): Promise<Record<string, unknown>> => {
    const res = await fetch(`${apiUrl}/${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401) onLogout();
    const result = (await res.json()) as Record<string, unknown> & {
      message?: string | string[];
    };
    if (!res.ok)
      throw new Error(
        Array.isArray(result.message)
          ? result.message.join(' ')
          : typeof result.message === 'string'
            ? result.message
          : 'Não foi possível concluir.',
      );
    return result;
  };
  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!formType) return;
    try {
      const payload =
        formType === 'client'
          ? {
              kind: clientKindToApi[form.kind] || 'INDIVIDUAL',
              name: form.name,
              document: form.document,
              email: form.email,
              phone: form.phone,
              city: form.city,
              notes: form.notes,
            }
          : formType === 'lead'
            ? {
                clientId: form.clientId,
                name: form.name,
                contact: form.contact,
                area: form.area,
                source: form.source,
                stage: stageToApi[form.stage] || 'NEW',
                estimatedValueCents: Math.max(
                  0,
                  Number(form.estimatedValue || 0),
                ),
                nextAction: form.nextAction,
              }
            : formType === 'task'
              ? {
                  matterId: form.matterId,
                  title: form.title,
                  description: form.description,
                  dueDate: form.dueDate,
                  dueTime: form.dueTime,
                  type: form.type,
                  status: (form.status || 'todo').toUpperCase(),
                  priority: priorityToApi[form.priority] || 'NORMAL',
                  assignee: form.assignee,
                }
              : {
                  clientId: form.clientId,
                  title: form.title,
                  number: form.number,
                  area: form.area,
                  court: form.court,
                  side: form.side,
                  stage: form.stage,
                  status: form.status,
                  valueCents: Math.max(0, Number(form.value || 0)),
                  notes: form.notes,
                };
      const path = `${entityPath[formType]}${editingId ? `/${editingId}` : ''}`;
      await request(path, editingId ? 'PUT' : 'POST', payload);
      setFormType(null);
      setEditingId('');
      setForm({});
      notify(editingId ? 'Cadastro atualizado.' : 'Cadastro salvo com segurança.');
      await load(search);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Não foi possível salvar.',
      );
    }
  };
  const moveTask = async (id: string, status: string) => {
    const previous = data;
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
    try {
      await request(`tasks/${id}/status`, 'PATCH', {
        status: status.toUpperCase(),
      });
      notify('Etapa da tarefa atualizada.');
      await load(search);
    } catch (error) {
      setData(previous);
      notify(
        error instanceof Error
          ? error.message
          : 'Não foi possível mover a tarefa.',
      );
    }
  };
  const remove = async () => {
    if (!deleting) return;
    try {
      const path = entityPath[deleting.entity as Exclude<FormType, null>];
      await request(`${path}/${deleting.id}`, 'DELETE');
      setDeleting(null);
      notify('Registro removido.');
      await load(search);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Não foi possível remover.',
      );
    }
  };
  const demo = async () => {
    try {
      await request('demo', 'POST');
      notify('Dados sintéticos carregados.');
      await load();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a demonstração.',
      );
    }
  };
  const overdue = data.tasks.filter(
    (t) => t.status !== 'done' && daysUntil(t.due_date) < 0,
  );
  const week = data.tasks.filter(
    (t) =>
      t.status !== 'done' &&
      daysUntil(t.due_date) >= 0 &&
      daysUntil(t.due_date) <= 7,
  );
  const active = data.matters.filter((m) => m.status !== 'Encerrado');
  const filtered = useMemo(() => {
    const q = normalizeSearch(search);
    const clientText = (c: Client) => [c.name, c.kind, c.document, c.email, c.phone, c.city, c.notes, ...data.matters.filter((m) => m.client_id === c.id).flatMap((m) => [m.title, m.number, m.area, m.court, m.side, m.stage, m.status, m.notes]), ...data.tasks.filter((t) => data.matters.some((m) => m.id === t.matter_id && m.client_id === c.id)).flatMap((t) => [t.title, t.description, t.type, t.priority, t.status, t.assignee, t.due_date])].join(' ');
    const matterText = (m: Matter) => [m.title, m.number, m.area, m.court, m.side, m.stage, m.status, m.notes, m.client_name, ...data.tasks.filter((t) => t.matter_id === m.id).flatMap((t) => [t.title, t.description, t.type, t.priority, t.status, t.assignee, t.due_date])].join(' ');
    return {
      clients: data.clients.filter((c) => matchesSearch(clientText(c), q)),
      matters: data.matters.filter((m) => matchesSearch(matterText(m), q)),
      suggestions: [
        ...data.clients.filter((c) => matchesSearch(clientText(c), q)).map((c) => ({ id: c.id, label: c.name, detail: `Cliente · ${c.city || c.kind}`, page: 'clients' as Page })),
        ...data.matters.filter((m) => matchesSearch(matterText(m), q)).map((m) => ({ id: m.id, label: m.title, detail: `Processo · ${m.client_name || m.area}`, page: 'matters' as Page })),
        ...data.tasks.filter((t) => matchesSearch([t.title, t.description, t.type, t.priority, t.status, t.assignee, t.due_date, t.matter_title].join(' '), q)).map((t) => ({ id: t.id, label: t.title, detail: `Prazo · ${t.matter_title || t.type}`, page: 'tasks' as Page })),
      ].slice(0, 7),
    };
  }, [data, search]);
  useEffect(() => {
    if (!search.trim()) return;
    const timer = window.setTimeout(() => void load(search), 180);
    return () => window.clearTimeout(timer);
  }, [load, search]);
  const openForm = (type: FormType, status?: string) => {
    setEditingId('');
    setFormType(type);
    setForm(
      type === 'task'
        ? {
            status: status || 'todo',
            dueDate: today(),
            priority: 'Normal',
            type: 'Prazo processual',
          }
        : type === 'matter'
          ? { area: 'Cível', status: 'Ativo', stage: 'Triagem' }
          : type === 'lead'
            ? { area: 'Cível', stage: 'Novo contato' }
            : { kind: 'Pessoa física' },
    );
  };
  const openEdit = (type: Exclude<FormType, null>, value: Client | Lead | Matter | Task) => {
    setFormType(type);
    setEditingId(value.id);
    if (type === 'client') {
      const client = value as Client;
      setForm({
        kind: client.kind,
        name: client.name,
        document: client.document || '',
        email: client.email || '',
        phone: client.phone || '',
        city: client.city || '',
        notes: client.notes || '',
      });
    } else if (type === 'lead') {
      const lead = value as Lead;
      setForm({
        clientId: lead.client_id || '',
        name: lead.name,
        contact: lead.contact || '',
        area: lead.area,
        source: lead.source || '',
        stage: lead.stage,
        estimatedValue: String(lead.estimated_value_cents),
        nextAction: lead.next_action || '',
      });
    } else if (type === 'matter') {
      const matter = value as Matter;
      setForm({
        clientId: matter.client_id || '',
        title: matter.title,
        number: matter.number || '',
        area: matter.area,
        court: matter.court || '',
        side: matter.side || '',
        stage: matter.stage,
        status: matter.status,
        value: String(matter.value_cents),
        notes: matter.notes || '',
      });
    } else {
      const task = value as Task;
      setForm({
        matterId: task.matter_id || '',
        title: task.title,
        description: task.description || '',
        dueDate: task.due_date,
        dueTime: task.due_time || '',
        type: task.type,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee || user.name,
      });
    }
  };
  const moveOpportunity = async (id: string, stage: string) => {
    const previous = data;
    setData((current) => ({
      ...current,
      leads: current.leads.map((lead) =>
        lead.id === id ? { ...lead, stage } : lead,
      ),
    }));
    try {
      await request(`opportunities/${id}/stage`, 'PATCH', {
        stage: stageToApi[stage],
      });
      notify('Etapa da oportunidade atualizada.');
    } catch (error) {
      setData(previous);
      notify(error instanceof Error ? error.message : 'Não foi possível mover.');
    }
  };
  const parseCsv = (file: File) => {
    setCsvName(file.name);
    setCsvPreview(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const text = (
        typeof reader.result === 'string' ? reader.result : ''
      ).replace(/^\uFEFF/, '');
      if (!text.trim()) {
        setCsvRows([]);
        notify('O arquivo CSV está vazio.');
        return;
      }
      if (text.includes('\uFFFD')) {
        setCsvRows([]);
        notify('O arquivo não está em UTF-8. Salve-o em UTF-8 e tente novamente.');
        return;
      }
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length > 501) {
        setCsvRows([]);
        notify('O arquivo excede o limite de 500 registros por importação.');
        return;
      }
      const sep =
        (lines[0]?.match(/;/g) || []).length >
        (lines[0]?.match(/,/g) || []).length
          ? ';'
          : ',';
      const headers = parseDelimitedLine(lines.shift() || '', sep).map((h) =>
        h
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      );
      const aliases: Record<string, keyof CsvRow> = {
        nome: 'name',
        name: 'name',
        tipo: 'kind',
        kind: 'kind',
        cpf: 'document',
        cnpj: 'document',
        documento: 'document',
        document: 'document',
        'e-mail': 'email',
        email: 'email',
        telefone: 'phone',
        phone: 'phone',
        cidade: 'city',
        city: 'city',
        area_oportunidade: 'opportunityArea',
        opportunity_area: 'opportunityArea',
        origem_oportunidade: 'opportunitySource',
        opportunity_source: 'opportunitySource',
        valor_oportunidade_centavos: 'opportunityValueCents',
        opportunity_value_cents: 'opportunityValueCents',
      };
      if (!headers.some((header) => aliases[header] === 'name')) {
        setCsvRows([]);
        notify('Cabeçalho obrigatório ausente: nome.');
        return;
      }
      const rows = lines.map((line) => {
        const values = parseDelimitedLine(line, sep);
        const row: CsvRow = {
          name: '',
          kind: 'Pessoa física',
          document: '',
          email: '',
          phone: '',
          city: '',
          opportunityArea: '',
          opportunitySource: '',
          opportunityValueCents: '',
        };
        headers.forEach((h, i) => {
          const key = aliases[h];
          if (key) row[key] = values[i] || '';
        });
        return row;
      });
      setCsvRows(rows);
      try {
        const result = await request('imports/clients/preview', 'POST', {
          fileName: file.name,
          rows: rows.map((row) => ({
            ...row,
            kind: clientKindToApi[row.kind] || 'INDIVIDUAL',
            opportunityValueCents: row.opportunityValueCents
              ? Number(row.opportunityValueCents)
              : undefined,
          })),
        });
        const preview: CsvPreview = {
          valid: Number(result.valid ?? 0),
          errors: Array.isArray(result.errors)
            ? (result.errors as CsvPreview['errors'])
            : [],
        };
        setCsvPreview(preview);
        notify(
          `${preview.valid} linhas válidas; ${preview.errors.length} com erro.`,
        );
      } catch (error) {
        setCsvPreview(null);
        notify(error instanceof Error ? error.message : 'Falha na validação.');
      }
    };
    reader.onerror = () => notify('Não foi possível ler o arquivo selecionado.');
    reader.readAsText(file, 'UTF-8');
  };
  const importCsv = async () => {
    try {
      const result = await request('imports/clients', 'POST', {
        fileName: csvName,
        rows: csvRows.map((row) => ({
          ...row,
          kind: clientKindToApi[row.kind] || 'INDIVIDUAL',
          opportunityValueCents: row.opportunityValueCents
            ? Number(row.opportunityValueCents)
            : undefined,
        })),
      });
      setCsvRows([]);
      setCsvName('');
      setCsvPreview(null);
      notify(
        `${Number(result.imported ?? 0)} clientes importados; ${Number(result.rejected ?? 0)} rejeitados.`,
      );
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Falha na importação.');
    }
  };
  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span>
            <Scale size={19} />
          </span>
          <strong>JurisFlow</strong>
        </div>
        <nav>
          {nav
            .filter(
              ([id]) =>
                (id !== 'audit' || user.role === 'ADMIN') &&
                (id !== 'imports' || user.role !== 'ASSISTANT'),
            )
            .map(([id, label, Icon]) => (
            <button
              key={id}
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
              aria-current={page === id ? 'page' : undefined}
            >
              <Icon />
              {label}
              {id === 'tasks' && week.length > 0 ? <b>{week.length}</b> : null}
            </button>
            ))}
        </nav>
        <div className="privacy-note">
          <ShieldCheck />
          <span>
            <strong>Dados protegidos</strong>
            <small>Acesso autenticado e auditável</small>
          </span>
        </div>
        <div className="sidebar-profile">
          <div>{initials(user.name)}</div>
          <span>
            <strong>{user.name}</strong>
            <small>
              {user.role === 'ADMIN'
                ? 'Administrador'
                : user.role === 'LAWYER'
                  ? 'Advogado'
                  : 'Assistente'}
            </small>
          </span>
          <button className="profile-logout" onClick={onLogout} title="Sair">
            <LogOut />
          </button>
        </div>
      </aside>
      <section className="workspace">
        <header className="topbar">
          <label className={`global-search ${searchFocused ? 'is-focused' : ''}`}>
            <Search />
            <input
              aria-label="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.suggestions[0]) setPage(filtered.suggestions[0].page);
                  else void load(search);
                  setSearchFocused(false);
                }
                if (e.key === 'Escape') { setSearch(''); setSearchFocused(false); }
              }}
              placeholder="Busque por nome, assunto, cidade, prazo..."
            />
            {search ? <button type="button" className="search-clear" aria-label="Limpar busca" onMouseDown={(e) => e.preventDefault()} onClick={() => setSearch('')}>×</button> : <kbd>↵</kbd>}
            {searchFocused && normalizeSearch(search).length > 1 ? <div className="search-suggestions" role="listbox" aria-label="Resultados da busca">
              {filtered.suggestions.length ? filtered.suggestions.map((item) => <button type="button" role="option" key={`${item.page}-${item.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { setPage(item.page); setSearchFocused(false); }}><span><strong>{item.label}</strong><small>{item.detail}</small></span><span aria-hidden="true">↗</span></button>) : <p>Nenhum resultado relacionado encontrado.</p>}
              <small className="search-hint">Busca em nomes, contatos, assuntos, etapas e prazos</small>
            </div> : null}
          </label>
          <button
            className="primary-action"
            onClick={() =>
              openForm(
                page === 'clients'
                  ? 'client'
                  : page === 'leads'
                    ? 'lead'
                    : page === 'matters'
                      ? 'matter'
                      : 'task',
              )
            }
          >
            <Plus /> Novo
          </button>
        </header>
        {feedback ? (
          <output className="toast-message">
            <CheckCircle2 />
            {feedback}
            <button aria-label="Fechar aviso" onClick={() => setFeedback('')}>
              <X />
            </button>
          </output>
        ) : null}
        <div className="content">
          {loading ? (
            <div className="loading-state">
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div key={page} className="page-transition">{renderPage()}</div>
          )}
        </div>
      </section>
      <Dialog
        open={!!formType}
        onOpenChange={(open) => !open && setFormType(null)}
      >
        <DialogContent className="form-dialog">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar ' : 'Novo '}
                {formType === 'client'
                  ? 'cliente'
                  : formType === 'lead'
                    ? 'oportunidade'
                    : formType === 'matter'
                      ? 'processo'
                      : 'prazo ou tarefa'}
              </DialogTitle>
              <DialogDescription>
                Preencha os campos essenciais. Você poderá complementar as
                informações depois.
              </DialogDescription>
            </DialogHeader>
            {formType === 'client'
              ? clientFields()
              : formType === 'lead'
                ? leadFields()
                : formType === 'matter'
                  ? matterFields()
                  : taskFields()}
            <DialogFooter>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setFormType(null)}
              >
                Cancelar
              </button>
              <button className="primary-action" type="submit">
                Salvar cadastro
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleting?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita e ficará registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );

  function input(
    name: string,
    label: string,
    type = 'text',
    required = false,
    wide = false,
  ) {
    return (
      <label className={`field ${wide ? 'wide' : ''}`}>
        <span>
          {label}
          {required ? ' *' : ''}
        </span>
        <input
          name={name}
          type={type}
          required={required}
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      </label>
    );
  }
  function select(
    name: string,
    label: string,
    options: string[] | [string, string][],
    required = true,
  ) {
    return (
      <label className="field">
        <span>
          {label}
          {required ? ' *' : ''}
        </span>
        <select
          name={name}
          required={required}
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        >
          <option value="">Selecione</option>
          {options.map((o) =>
            Array.isArray(o) ? (
              <option key={o[0]} value={o[0]}>
                {o[1]}
              </option>
            ) : (
              <option key={o}>{o}</option>
            ),
          )}
        </select>
      </label>
    );
  }
  function textarea(name: string, label: string) {
    return (
      <label className="field wide">
        <span>{label}</span>
        <textarea
          name={name}
          value={form[name] || ''}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        />
      </label>
    );
  }
  function clientFields() {
    return (
      <div className="form-grid">
        {input('name', 'Nome completo ou razão social', 'text', true, true)}
        {select('kind', 'Tipo', ['Pessoa física', 'Pessoa jurídica'])}
        {input('document', 'CPF ou CNPJ')}
        {input('email', 'E-mail', 'email')}
        {input('phone', 'Telefone')}
        {input('city', 'Cidade')}
        {textarea('notes', 'Observações')}
      </div>
    );
  }
  function matterFields() {
    return (
      <div className="form-grid">
        {input('title', 'Título do processo', 'text', true, true)}
        {input('number', 'Número CNJ')}
        {select(
          'clientId',
          'Cliente',
          data.clients.map((c) => [c.id, c.name] as [string, string]),
          false,
        )}
        {select('area', 'Área', [
          'Cível',
          'Trabalhista',
          'Família',
          'Criminal',
          'Previdenciário',
          'Empresarial',
          'Tributário',
          'Outro',
        ])}
        {select(
          'side',
          'Polo',
          ['Requerente', 'Requerido', 'Interessado'],
          false,
        )}
        {input('court', 'Vara ou tribunal', 'text', false, true)}
        {select('stage', 'Etapa', [
          'Triagem',
          'Petição inicial',
          'Citação',
          'Contestação',
          'Instrução',
          'Sentença',
          'Recurso',
          'Execução',
          'Arquivado',
        ])}
        {select('status', 'Situação', [
          'Ativo',
          'Aguardando',
          'Suspenso',
          'Encerrado',
        ])}
        {input('value', 'Valor da causa (centavos)', 'number')}
        {textarea('notes', 'Resumo e estratégia')}
      </div>
    );
  }
  function leadFields() {
    return (
      <div className="form-grid">
        {input('name', 'Nome do potencial cliente', 'text', true, true)}
        {select(
          'clientId',
          'Cliente já cadastrado',
          data.clients.map((client) => [client.id, client.name] as [string, string]),
          false,
        )}
        {input('contact', 'Telefone ou e-mail')}
        {select('area', 'Área de interesse', [
          'Cível',
          'Trabalhista',
          'Família',
          'Criminal',
          'Previdenciário',
          'Empresarial',
          'Outro',
        ])}
        {select(
          'source',
          'Origem',
          ['Indicação', 'Site', 'Rede social', 'Evento', 'Outro'],
          false,
        )}
        {select('stage', 'Etapa', [
          'Novo contato',
          'Consulta agendada',
          'Proposta enviada',
          'Negociação',
          'Contratado',
          'Não convertido',
        ])}
        {input('estimatedValue', 'Valor estimado (centavos)', 'number')}
        {textarea('nextAction', 'Próxima ação')}
      </div>
    );
  }
  function taskFields() {
    return (
      <div className="form-grid">
        {input('title', 'Título', 'text', true, true)}
        {select(
          'matterId',
          'Processo',
          data.matters.map((m) => [m.id, m.title] as [string, string]),
          false,
        )}
        {select('type', 'Tipo', [
          'Prazo processual',
          'Audiência',
          'Reunião',
          'Petição',
          'Diligência',
          'Tarefa',
        ])}
        {input('dueDate', 'Data limite', 'date', true)}
        {input('dueTime', 'Horário', 'time')}
        {select('priority', 'Prioridade', [
          'Urgente',
          'Alta',
          'Normal',
          'Baixa',
        ])}
        {select(
          'status',
          'Etapa',
          columns.map((c) => [c.id, c.label] as [string, string]),
        )}
        {select(
          'assignee',
          'Responsável',
          data.users.map((member) => [member.name, member.name] as [string, string]),
          false,
        )}
        {textarea('description', 'Descrição e próximos passos')}
      </div>
    );
  }
  function renderPage() {
    if (page === 'dashboard') return <Dashboard />;
    if (page === 'leads') return <Leads />;
    if (page === 'clients') return <Clients />;
    if (page === 'matters') return <Matters />;
    if (page === 'tasks') return <Tasks />;
    if (page === 'imports') return <Imports />;
    return <AuditView />;
  }
  function PageTitle({
    eyebrow,
    title,
    subtitle,
    action,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    action?: React.ReactNode;
  }) {
    return (
      <div className="page-heading">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
    );
  }
  function Empty({
    icon: Icon,
    title,
    text,
    button,
  }: {
    icon: typeof Users;
    title: string;
    text: string;
    button?: React.ReactNode;
  }) {
    return (
      <div className="empty-state">
        <span>
          <Icon />
        </span>
        <h3>{title}</h3>
        <p>{text}</p>
        {button}
      </div>
    );
  }
  function Dashboard() {
    return (
      <>
        <PageTitle
          eyebrow="PAINEL DO ESCRITÓRIO"
          title={`Bom dia, ${user.name.split(' ')[0]}.`}
          subtitle={
            overdue.length
              ? `Há ${overdue.length} prazo(s) vencido(s) que exigem atenção.`
              : `Você tem ${week.length} compromisso(s) para os próximos 7 dias.`
          }
          action={
            <button className="outline-action" onClick={() => setPage('tasks')}>
              <CalendarDays />
              Ver agenda
            </button>
          }
        />
        <div className="metrics">
          <article style={{ '--stagger': '0ms' } as React.CSSProperties}>
            <span className="metric-icon navy">
              <BriefcaseBusiness />
            </span>
            <div>
              <small>Processos ativos</small>
              <strong>{active.length}</strong>
              <em>
                {data.matters.filter((m) => m.status === 'Aguardando').length}{' '}
                aguardando movimentação
              </em>
            </div>
          </article>
          <article style={{ '--stagger': '70ms' } as React.CSSProperties}>
            <span className="metric-icon blue">
              <Users />
            </span>
            <div>
              <small>Clientes</small>
              <strong>{data.clients.length}</strong>
              <em>Base centralizada</em>
            </div>
          </article>
          <article style={{ '--stagger': '140ms' } as React.CSSProperties}>
            <span className="metric-icon amber">
              <Clock3 />
            </span>
            <div>
              <small>Prazos em 7 dias</small>
              <strong>{week.length}</strong>
              <em>{overdue.length} vencidos</em>
            </div>
          </article>
          <article style={{ '--stagger': '210ms' } as React.CSSProperties}>
            <span className="metric-icon green">
              <CheckCircle2 />
            </span>
            <div>
              <small>Tarefas concluídas</small>
              <strong>
                {data.tasks.filter((t) => t.status === 'done').length}
              </strong>
              <em>Histórico auditável</em>
            </div>
          </article>
        </div>
        {!data.clients.length ? (
          <Empty
            icon={Scale}
            title="Seu escritório está pronto"
            text="Carregue dados sintéticos ou comece cadastrando um cliente."
            button={
              <div className="empty-actions">
                <button
                  className="primary-action"
                  onClick={() => openForm('client')}
                >
                  Cadastrar cliente
                </button>
                <button className="secondary-action" onClick={demo}>
                  Carregar demonstração
                </button>
              </div>
            }
          />
        ) : (
          <div className="dashboard-grid">
            <section className="surface">
              <div className="section-heading">
                <div>
                  <h2>Próximos compromissos</h2>
                  <p>Ordenados por urgência e vencimento.</p>
                </div>
                <button
                  className="text-action"
                  onClick={() => setPage('tasks')}
                >
                  Ver kanban →
                </button>
              </div>
              {[...data.tasks]
                .filter((t) => t.status !== 'done')
                .slice(0, 5)
                .map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
            </section>
            <section className="surface">
              <div className="section-heading">
                <div>
                  <h2>Processos recentes</h2>
                  <p>Últimas movimentações registradas.</p>
                </div>
              </div>
              {data.matters.slice(0, 5).map((m) => (
                <div className="compact-row" key={m.id}>
                  <span className="metric-icon navy">
                    <BriefcaseBusiness />
                  </span>
                  <div>
                    <strong>{m.title}</strong>
                    <small>
                      {m.client_name || 'Cliente não vinculado'} · {m.stage}
                    </small>
                  </div>
                  <span className="status-chip">{m.status}</span>
                </div>
              ))}
            </section>
          </div>
        )}
      </>
    );
  }
  function Leads() {
    const stages = [
      'Novo contato',
      'Consulta agendada',
      'Proposta enviada',
      'Negociação',
      'Contratado',
      'Não convertido',
    ];
    return (
      <>
        <PageTitle
          eyebrow="CAPTAÇÃO E INTAKE"
          title="Oportunidades"
          subtitle="Acompanhe potenciais clientes do primeiro contato à contratação."
          action={
            <button className="primary-action" onClick={() => openForm('lead')}>
              <Plus /> Nova oportunidade
            </button>
          }
        />
        <div className="lead-board">
          {stages.map((stage) => (
            <section
              className={`lead-column ${dragging ? 'drag-active' : ''}`}
              key={stage}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragging) void moveOpportunity(dragging, stage);
                setDragging('');
              }}
            >
              <div className="column-title">
                <span>
                  <i className="dot blue-dot" />
                  {stage}
                </span>
                <b>
                  {data.leads.filter((lead) => lead.stage === stage).length}
                </b>
              </div>
              {data.leads
                .filter((lead) => lead.stage === stage)
                .map((lead) => (
                  <article
                    className="lead-card"
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => setDragging('')}
                  >
                    <div className="card-top">
                      <span className="matter-area">{lead.area}</span>
                      <span className="card-actions">
                        <button
                          className="icon-action"
                          aria-label={`Editar ${lead.name}`}
                          onClick={() => openEdit('lead', lead)}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="icon-action danger-action"
                          aria-label={`Excluir ${lead.name}`}
                          onClick={() =>
                            setDeleting({
                              entity: 'lead',
                              id: lead.id,
                              label: lead.name,
                            })
                          }
                        >
                          <X />
                        </button>
                      </span>
                    </div>
                    <h3>{lead.name}</h3>
                    <p>{lead.contact || 'Contato não informado'}</p>
                    <footer>
                      <span>{lead.source || 'Origem não informada'}</span>
                      <span>{lead.next_action || 'Definir próxima ação'}</span>
                    </footer>
                  </article>
                ))}
              <button
                className="add-card"
                onClick={() => {
                  openForm('lead');
                  setForm((value) => ({ ...value, stage }));
                }}
              >
                <Plus />
                Adicionar
              </button>
            </section>
          ))}
        </div>
      </>
    );
  }
  function Clients() {
    return (
      <>
        <PageTitle
          eyebrow="RELACIONAMENTO"
          title="Clientes"
          subtitle="Pessoas e empresas atendidas pelo escritório."
          action={
            <button
              className="primary-action"
              onClick={() => openForm('client')}
            >
              <Plus />
              Novo cliente
            </button>
          }
        />
        {filtered.clients.length ? (
          <div className="table-surface">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Tipo</th>
                  <th>Processos</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {filtered.clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <small>{c.document || 'Documento não informado'}</small>
                    </td>
                    <td>
                      {c.email || '—'}
                      <small>{c.phone || c.city || ''}</small>
                    </td>
                    <td>
                      <span className="status-chip">{c.kind}</span>
                    </td>
                    <td>{c.matter_count}</td>
                    <td className="card-actions">
                      <button
                        className="icon-action"
                        aria-label={`Editar ${c.name}`}
                        onClick={() => openEdit('client', c)}
                      >
                        <Pencil />
                      </button>
                      <button
                        className="icon-action danger-action"
                        aria-label={`Excluir ${c.name}`}
                        onClick={() =>
                          setDeleting({
                            entity: 'client',
                            id: c.id,
                            label: c.name,
                          })
                        }
                      >
                        <X />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={Users}
            title="Nenhum cliente encontrado"
            text="Cadastre um cliente ou ajuste sua busca."
            button={
              <button
                className="primary-action"
                onClick={() => openForm('client')}
              >
                Novo cliente
              </button>
            }
          />
        )}
      </>
    );
  }
  function Matters() {
    return (
      <>
        <PageTitle
          eyebrow="GESTÃO PROCESSUAL"
          title="Processos"
          subtitle="Casos, partes, etapas e movimentações em uma visão única."
          action={
            <button
              className="primary-action"
              onClick={() => openForm('matter')}
            >
              <Plus />
              Novo processo
            </button>
          }
        />
        {filtered.matters.length ? (
          <div className="matter-grid">
            {filtered.matters.map((m) => (
              <article className="matter-card" key={m.id}>
                <div className="card-top">
                  <span className="status-chip">{m.status}</span>
                  <span className="card-actions">
                    <button
                      className="icon-action"
                      aria-label={`Editar ${m.title}`}
                      onClick={() => openEdit('matter', m)}
                    >
                      <Pencil />
                    </button>
                    <button
                      className="icon-action danger-action"
                      aria-label={`Excluir ${m.title}`}
                      onClick={() =>
                        setDeleting({
                          entity: 'matter',
                          id: m.id,
                          label: m.title,
                        })
                      }
                    >
                      <X />
                    </button>
                  </span>
                </div>
                <span className="matter-area">
                  {m.area} · {m.side || 'Polo não informado'}
                </span>
                <h3>{m.title}</h3>
                <p className="mono">{m.number || 'Sem número CNJ'}</p>
                <p>{m.client_name || 'Cliente não vinculado'}</p>
                <footer>
                  <span>{m.stage}</span>
                  <span>{m.court || 'Tribunal não informado'}</span>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            icon={BriefcaseBusiness}
            title="Nenhum processo encontrado"
            text="Abra o primeiro caso e vincule-o a um cliente."
            button={
              <button
                className="primary-action"
                onClick={() => openForm('matter')}
              >
                Novo processo
              </button>
            }
          />
        )}
      </>
    );
  }
  function Tasks() {
    return (
      <>
        <PageTitle
          eyebrow="PRAZOS E TAREFAS"
          title="Fluxo jurídico"
          subtitle="Arraste cartões entre as etapas e mantenha os prazos sob controle."
          action={
            <button className="primary-action" onClick={() => openForm('task')}>
              <Plus />
              Novo compromisso
            </button>
          }
        />
        <div className="task-toolbar">
          <div className="deadline-summary">
            <span className="urgent-summary">
              <AlertTriangle />
              {overdue.length} vencidos
            </span>
            <span>
              <Clock3 />
              {week.length} nos próximos 7 dias
            </span>
          </div>
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutDashboard />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {view === 'kanban' ? (
          <div className="kanban-board full-board">
            {columns.map((col) => (
              <section
                className={`kanban-column ${dragging ? 'drag-active' : ''}`}
                key={col.id}
                aria-label={`Etapa ${col.label}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging) void moveTask(dragging, col.id);
                  setDragging('');
                }}
              >
                <div className="column-title">
                  <span>
                    <i className={`dot ${col.tone}`} />
                    {col.label}
                  </span>
                  <b>{data.tasks.filter((t) => t.status === col.id).length}</b>
                </div>
                {data.tasks
                  .filter((t) => t.status === col.id)
                  .map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                <button
                  className="add-card"
                  onClick={() => openForm('task', col.id)}
                >
                  <Plus />
                  Adicionar
                </button>
              </section>
            ))}
          </div>
        ) : (
          <div className="surface task-list">
            {data.tasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </>
    );
  }
  function TaskCard({ task }: { task: Task }) {
    const late = task.status !== 'done' && daysUntil(task.due_date) < 0;
    return (
      <article
        className={`task-card ${task.status === 'done' ? 'completed' : ''}`}
        draggable
        aria-label={`Tarefa ${task.title}`}
        onDragStart={() => setDragging(task.id)}
        onDragEnd={() => setDragging('')}
      >
        <div className="card-top">
          <span
            className={`priority ${task.priority === 'Urgente' ? 'danger' : task.priority === 'Alta' ? 'warning' : 'neutral'}`}
          >
            {task.priority}
          </span>
          <span className="card-actions">
            <button
              className="icon-action"
              aria-label={`Editar ${task.title}`}
              onClick={() => openEdit('task', task)}
            >
              <Pencil />
            </button>
            <button
              className="icon-action danger-action"
              aria-label={`Excluir ${task.title}`}
              onClick={() =>
                setDeleting({ entity: 'task', id: task.id, label: task.title })
              }
            >
              <MoreHorizontal />
            </button>
          </span>
        </div>
        <h3>{task.title}</h3>
        <p>{task.matter_title || 'Atividade geral'}</p>
        <footer>
          <span className={late ? 'late' : ''}>
            <Clock3 /> {late ? 'Vencido · ' : ''}
            {formatDate(task.due_date)} {task.due_time || ''}
          </span>
          <span className="mini-avatar">
            {initials(task.assignee || user.name)}
          </span>
        </footer>
      </article>
    );
  }
  function TaskRow({ task }: { task: Task }) {
    const late = task.status !== 'done' && daysUntil(task.due_date) < 0;
    return (
      <div className="compact-row task-line">
        <button
          className={`round-check ${task.status === 'done' ? 'checked' : ''}`}
          onClick={() =>
            void moveTask(task.id, task.status === 'done' ? 'todo' : 'done')
          }
        >
          {task.status === 'done' ? <CheckCircle2 /> : <CircleDot />}
        </button>
        <div>
          <strong>{task.title}</strong>
          <small>
            {task.matter_title || 'Atividade geral'} · {task.type}
          </small>
        </div>
        <span className={late ? 'date-chip late' : 'date-chip'}>
          {formatDate(task.due_date)}
        </span>
      </div>
    );
  }
  function Imports() {
    return (
      <>
        <PageTitle
          eyebrow="QUALIDADE DE DADOS"
          title="Importação CSV"
          subtitle="Valide, visualize e confirme os dados antes de gravar."
        />
        <div className="import-grid">
          <section className="surface upload-surface">
            <div className="upload-icon">
              <Upload />
            </div>
            <h2>Importar clientes</h2>
            <p>
              Use CSV em UTF-8, separado por vírgula ou ponto e vírgula.
              Cabeçalhos aceitos: nome, tipo, CPF/CNPJ, e-mail, telefone,
              cidade e os campos opcionais de oportunidade.
            </p>
            <label className="file-button">
              <Upload />
              Selecionar arquivo
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) =>
                  e.target.files?.[0] && parseCsv(e.target.files[0])
                }
              />
            </label>
            <button
              className="text-action"
              onClick={() => {
                const content =
                  'nome;tipo;cpf;email;telefone;cidade;area_oportunidade;origem_oportunidade;valor_oportunidade_centavos\nMaria Souza;Pessoa física;529.982.247-25;maria@example.com;(65) 99999-0000;Cuiabá;Cível;Indicação;150000';
                const a = document.createElement('a');
                a.href = URL.createObjectURL(
                  new Blob([content], { type: 'text/csv' }),
                );
                a.download = 'modelo-clientes.csv';
                a.click();
              }}
            >
              <Download />
              Baixar modelo CSV
            </button>
          </section>
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>
                  {csvRows.length
                    ? `Pré-visualização · ${csvName}`
                    : 'Histórico de importações'}
                </h2>
                <p>
                  {csvRows.length
                    ? csvPreview
                      ? `${csvPreview.valid} válidos · ${csvPreview.errors.length} com erro. Apenas os válidos serão gravados.`
                      : 'Validando os registros no servidor local...'
                    : 'Últimos arquivos processados.'}
                </p>
              </div>
              {csvRows.length ? (
                <button
                  className="primary-action"
                  disabled={!csvPreview || csvPreview.valid === 0}
                  onClick={importCsv}
                >
                  Confirmar importação
                </button>
              ) : null}
            </div>
            {csvRows.length ? (
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Documento</th>
                      <th>E-mail</th>
                      <th>Validação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td>
                          {r.name || <span className="late">Nome ausente</span>}
                        </td>
                        <td>{r.document || '—'}</td>
                        <td>{r.email || '—'}</td>
                        <td>
                          {csvPreview?.errors.find((error) => error.line === i + 2)
                            ?.message || (csvPreview ? 'Válido' : 'Validando...')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : data.imports.length ? (
              data.imports.map((job) => (
                <div className="compact-row" key={job.id}>
                  <span className="metric-icon blue">
                    <FileText />
                  </span>
                  <div>
                    <strong>{job.file_name}</strong>
                    <small>
                      {job.imported_count} importados · {job.rejected_count}{' '}
                      rejeitados
                    </small>
                  </div>
                  <span className="status-chip">{job.status}</span>
                </div>
              ))
            ) : (
              <Empty
                icon={Upload}
                title="Nenhuma importação"
                text="Os arquivos processados aparecerão aqui."
              />
            )}
          </section>
        </div>
      </>
    );
  }
  function AuditView() {
    return (
      <>
        <PageTitle
          eyebrow="SEGURANÇA E LGPD"
          title="Trilha de auditoria"
          subtitle="Registro das alterações realizadas nos dados do escritório."
        />
        <div className="audit-layout">
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>Atividade recente</h2>
                <p>Ações atribuídas ao usuário autenticado.</p>
              </div>
            </div>
            {data.audit.length ? (
              data.audit.map((item) => (
                <div className="compact-row" key={item.id}>
                  <span className="metric-icon navy">
                    <FileClock />
                  </span>
                  <div>
                    <strong>
                      {item.action} {item.entity}
                    </strong>
                    <small>
                      {item.details || 'Sem detalhes'} ·{' '}
                      {formatDate(item.created_at)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                icon={Archive}
                title="Auditoria vazia"
                text="As próximas alterações ficarão registradas aqui."
              />
            )}
          </section>
          <aside className="security-card">
            <ShieldCheck />
            <h2>Controles aplicados</h2>
            <ul>
              <li>Acesso por usuário autenticado</li>
              <li>Dados separados por proprietário</li>
              <li>Consultas preparadas</li>
              <li>Validação de e-mail e duplicidade</li>
              <li>Histórico de alterações</li>
            </ul>
            <p>
              A adequação completa à LGPD também depende das políticas e
              processos internos do escritório.
            </p>
          </aside>
        </div>
      </>
    );
  }
}
