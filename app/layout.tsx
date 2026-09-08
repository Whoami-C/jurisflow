import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JurisFlow | Gestão jurídica',
  description: 'CRM jurídico para clientes, processos, prazos e tarefas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
