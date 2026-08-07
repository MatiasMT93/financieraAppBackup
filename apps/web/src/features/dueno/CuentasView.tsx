import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../shared/api/client.ts';
import type { User } from '@cambioapp/shared-types';

const ROLE_LABELS: Record<string, string> = {
  coordinador:    'Coordinadores',
  administrativo: 'Administradores',
  cadete:         'Cadetes',
};

const ROLE_ORDER = ['coordinador', 'administrativo', 'cadete'];

function BackIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" width={20} height={20}>
      <path d="M20 8l-8 8 8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width={16} height={16}>
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 11.5L20 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 5l2 2M15 6l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ResetPasswordForm({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => apiPost(`/owner/accounts/${userId}/reset-password`, { password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-accounts'] });
      onDone();
    },
  });

  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = password.length > 0 && password === confirm;

  return (
    <div style={{
      marginTop: 10,
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoFocus
        style={{
          background: '#13151a',
          border: '1px solid #2c303a',
          borderRadius: 8,
          color: '#e6e9ef',
          fontSize: 14,
          padding: '9px 12px',
          outline: 'none',
        }}
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        style={{
          background: '#13151a',
          border: `1px solid ${mismatch ? '#ef4444' : '#2c303a'}`,
          borderRadius: 8,
          color: '#e6e9ef',
          fontSize: 14,
          padding: '9px 12px',
          outline: 'none',
        }}
      />
      {mismatch && (
        <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>Las contraseñas no coinciden</p>
      )}
      {mutation.isError && (
        <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>Error al guardar. Intentá de nuevo.</p>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          disabled={!valid || mutation.isPending}
          onClick={() => mutation.mutate()}
          style={{
            flex: 1,
            padding: '9px 0',
            borderRadius: 8,
            border: 'none',
            background: valid ? '#10b981' : '#2c303a',
            color: valid ? '#fff' : '#8b93a3',
            fontWeight: 600,
            fontSize: 13,
            cursor: valid ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: '1px solid #2c303a',
            background: 'transparent',
            color: '#8b93a3',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: 10,
      background: '#1e2128',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#e6e9ef' }}>
            {user.nombre ?? user.usuario}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8b93a3' }}>@{user.usuario}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {done && !resetting && (
            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✓ Actualizada</span>
          )}
          <button
            type="button"
            onClick={() => { setResetting((v) => !v); setDone(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid rgba(240,185,11,0.4)',
              background: resetting ? 'rgba(240,185,11,0.12)' : 'transparent',
              color: '#f0b90b',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <KeyIcon />
            {resetting ? 'Cancelar' : 'Restablecer contraseña'}
          </button>
        </div>
      </div>

      {resetting && (
        <ResetPasswordForm
          userId={user.id}
          onDone={() => { setResetting(false); setDone(true); }}
          onCancel={() => setResetting(false)}
        />
      )}
    </div>
  );
}

export default function CuentasView() {
  const navigate = useNavigate();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['owner-accounts'],
    queryFn: () => apiGet<User[]>('/owner/accounts'),
  });

  const grouped = ROLE_ORDER.reduce<Record<string, User[]>>((acc, role) => {
    acc[role] = accounts.filter((u) => u.role === role);
    return acc;
  }, {});

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', background: '#13151a', color: '#e6e9ef' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        background: '#13151a',
        zIndex: 10,
      }}>
        <button
          type="button"
          onClick={() => navigate('/dueno')}
          style={{ background: 'none', border: 'none', color: '#8b93a3', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <BackIcon />
        </button>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Gestión de Cuentas</h1>
      </header>

      <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {isLoading ? (
          <p style={{ color: '#8b93a3', textAlign: 'center' }}>Cargando…</p>
        ) : (
          ROLE_ORDER.map((role) => {
            const group = grouped[role];
            if (!group || group.length === 0) return null;
            return (
              <section key={role}>
                <h2 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {ROLE_LABELS[role]}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.map((user) => <UserRow key={user.id} user={user} />)}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
