'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
    } else {
      router.replace('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        padding: '40px 36px',
        maxWidth: 400,
        width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ma Baker & Chef" style={{ height: 64, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ marginTop: 12, fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: '1.5px' }}>
            SISTEMA DE RECLUTAMIENTO
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginTop: 4 }}>
            Acceso RH
          </h1>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6, letterSpacing: '0.5px' }}>
              CORREO ELECTRÓNICO
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@mabakerandchef.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #E0E0E0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#D7282F'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6, letterSpacing: '0.5px' }}>
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1.5px solid #E0E0E0',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#D7282F'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E0E0E0'; }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(211,47,47,0.08)',
              border: '1.5px solid rgba(211,47,47,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#D32F2F',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: 'none',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar →'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: '#F8F8F8', borderRadius: 10, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
          Acceso restringido al personal autorizado de Ma Baker & Chef.
          <br />Solicita tus credenciales a Administración.
        </div>
      </div>
    </div>
  );
}
