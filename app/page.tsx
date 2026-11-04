'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, Scale } from 'lucide-react';
import { CrmApp } from './crm-app';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'LAWYER' | 'ASSISTANT';
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function Home() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [email, setEmail] = useState('admin@jurisflow.local');
  const [password, setPassword] = useState('JurisFlow@2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = window.localStorage.getItem('jurisflow_token');
    if (!saved) {
      setLoading(false);
      return;
    }
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        setUser((await response.json()) as SessionUser);
        setToken(saved);
      })
      .catch(() => window.localStorage.removeItem('jurisflow_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = (await response.json()) as {
        accessToken?: string;
        user?: SessionUser;
        message?: string | string[];
      };
      if (!response.ok || !body.accessToken || !body.user) {
        throw new Error(
          Array.isArray(body.message)
            ? body.message.join(' ')
            : body.message || 'Não foi possível entrar.',
        );
      }
      window.localStorage.setItem('jurisflow_token', body.accessToken);
      setToken(body.accessToken);
      setUser(body.user);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Não foi possível entrar.',
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem('jurisflow_token');
    setToken('');
    setUser(null);
  };

  if (loading && !user) {
    return <div className="login-loading">Preparando o JurisFlow...</div>;
  }

  if (user && token) {
    return <CrmApp user={user} token={token} onLogout={logout} />;
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span><Scale /></span>
          <div>
            <strong>JurisFlow</strong>
            <small>Gestão jurídica local</small>
          </div>
        </div>
        <div className="login-copy">
          <span>AMBIENTE PRIVADO</span>
          <h1>Seu escritório organizado em um só fluxo.</h1>
          <p>Clientes, processos, oportunidades e prazos armazenados no PostgreSQL deste computador.</p>
        </div>
        <form onSubmit={login} className="login-form">
          <div className="login-lock"><LockKeyhole /></div>
          <h2>Entrar no sistema</h2>
          <label>
            <span>E-mail</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            <span>Senha</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={8} />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary-action" disabled={loading} type="submit">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
          <small>Usuário inicial: admin@jurisflow.local</small>
        </form>
      </section>
    </main>
  );
}
