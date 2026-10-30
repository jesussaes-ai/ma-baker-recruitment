'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Candidato } from '@/lib/supabase';

type RHUser = { email: string; nombre: string; rol: string };

type Filter = { puesto: string; veredicto: string };
const VERDICTS = ['Todos', 'Apto para Entrevista', 'Evaluación Adicional', 'No cumple perfil'];

export default function DashboardPage() {
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ puesto: 'Todos', veredicto: 'Todos' });
  const [selected, setSelected] = useState<Candidato | null>(null);
  const [rhUser, setRhUser] = useState<RHUser | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const meta = session.user.user_metadata as { rol?: string; nombre?: string };
    setRhUser({ email: session.user.email ?? '', nombre: meta.nombre ?? '', rol: meta.rol ?? '' });
    fetchCandidatos();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  async function fetchCandidatos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('candidatos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setCandidatos(data ?? []);
    setLoading(false);
  }

  const puestos = ['Todos', ...Array.from(new Set(candidatos.map((c) => c.puesto_aplicado).filter(Boolean)))];

  const filtered = candidatos.filter((c) => {
    const puestoOk = filter.puesto === 'Todos' || c.puesto_aplicado === filter.puesto;
    const veredictoOk = filter.veredicto === 'Todos' || c.veredicto_final === filter.veredicto;
    return puestoOk && veredictoOk;
  });

  const verdictColor = (v: string) => {
    if (v === 'Apto para Entrevista') return '#4CAF50';
    if (v === 'Evaluación Adicional') return '#FFC107';
    return '#D32F2F';
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      <div style={{ background: 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>MA BAKER & CHEF</div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Dashboard de Reclutamiento</h1>
            {rhUser && (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                {rhUser.nombre} · <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{rhUser.rol}</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/welcome')}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Nueva Evaluación
            </button>
            {(rhUser?.rol === 'medico' || rhUser?.rol === 'admin' || rhUser?.rol === 'rrhh') && (
              <button
                onClick={() => router.push('/medico')}
                style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Eval. Médica
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total" value={candidatos.length} color="#0071BC" />
          <StatCard label="Aptos" value={candidatos.filter((c) => c.veredicto_final === 'Apto para Entrevista').length} color="#4CAF50" />
          <StatCard label="En Revisión" value={candidatos.filter((c) => c.veredicto_final === 'Evaluación Adicional').length} color="#FFC107" />
          <StatCard label="No aptos" value={candidatos.filter((c) => c.veredicto_final === 'No cumple perfil').length} color="#D32F2F" />
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>PUESTO</label>
            <select
              value={filter.puesto}
              onChange={(e) => setFilter((f) => ({ ...f, puesto: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, background: '#fff', color: '#1A1A1A' }}
            >
              {puestos.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#666', display: 'block', marginBottom: 4 }}>VEREDICTO</label>
            <select
              value={filter.veredicto}
              onChange={(e) => setFilter((f) => ({ ...f, veredicto: e.target.value }))}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, background: '#fff', color: '#1A1A1A' }}
            >
              {VERDICTS.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <button
            onClick={fetchCandidatos}
            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 8, border: 'none', background: '#D7282F', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666', fontSize: 15 }}>Cargando candidatos...</div>
        ) : error ? (
          <div style={{ background: 'rgba(211,47,47,0.1)', border: '2px solid #D32F2F', borderRadius: 10, padding: 20, color: '#D32F2F', fontWeight: 600 }}>
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 15 }}>No hay candidatos con los filtros seleccionados.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 100px 80px',
                  gap: 12,
                  alignItems: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  border: '1.5px solid transparent',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D7282F'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(215,40,47,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>{c.nombre || '—'}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>{c.puesto_aplicado || '—'}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: verdictColor(c.veredicto_final) }}>{c.puntaje_evaluacion_tecnica ?? '—'}%</div>
                </div>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    background: `${verdictColor(c.veredicto_final)}18`,
                    color: verdictColor(c.veredicto_final),
                  }}>
                    {c.veredicto_final === 'Apto para Entrevista' ? 'APTO' : c.veredicto_final === 'Evaluación Adicional' ? 'REVISIÓN' : 'NO APTO'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{selected.nombre}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ background: `${verdictColor(selected.veredicto_final)}11`, border: `2px solid ${verdictColor(selected.veredicto_final)}33`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, color: verdictColor(selected.veredicto_final), fontSize: 15 }}>{selected.veredicto_final}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: verdictColor(selected.veredicto_final) }}>{selected.puntaje_evaluacion_tecnica}%</div>
            </div>

            <DetailGrid data={{
              'Puesto': selected.puesto_aplicado,
              'Edad': selected.edad ? `${selected.edad} años` : '—',
              'Género': selected.genero || '—',
              'Estatura': selected.estatura ? `${selected.estatura} cm` : '—',
              'Peso': selected.peso ? `${selected.peso} kg` : '—',
              'Estado Médico': selected.estado_medico || 'pendiente',
              'Fecha': selected.created_at ? new Date(selected.created_at).toLocaleString('es-MX') : '—',
              'ID': `#${selected.id}`,
            }} />

            {selected.documentos && Object.keys(selected.documentos).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#D7282F', marginBottom: 8 }}>DOCUMENTOS</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(selected.documentos).map(([k, url]) => (
                    <a key={k} href={url as string} target="_blank" rel="noreferrer"
                      style={{ background: '#E3F2FD', color: '#0071BC', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                      {k.toUpperCase()}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginTop: 4 }}>{label.toUpperCase()}</div>
    </div>
  );
}

function DetailGrid({ data }: { data: Record<string, string> }) {
  return (
    <div>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F5F5F5', fontSize: 13 }}>
          <span style={{ color: '#666', fontWeight: 500 }}>{k}</span>
          <span style={{ color: '#1A1A1A', fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}
