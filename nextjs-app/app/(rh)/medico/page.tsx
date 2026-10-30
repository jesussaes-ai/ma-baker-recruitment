'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, type Candidato } from '@/lib/supabase';

type EvalMedica = {
  vision: string;
  audicion: string;
  glucosa: string;
  presion: string;
  imc: string;
  observaciones: string;
};

const EMPTY_EVAL: EvalMedica = {
  vision: '', audicion: '', glucosa: '', presion: '', imc: '', observaciones: '',
};

const ESTADO_OPTS = [
  { value: 'apto', label: 'Apto', color: '#4CAF50' },
  { value: 'observaciones', label: 'Con Observaciones', color: '#FFC107' },
  { value: 'no_apto', label: 'No Apto', color: '#D32F2F' },
];

export default function MedicoPage() {
  const router = useRouter();
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Candidato | null>(null);
  const [eval_, setEval] = useState<EvalMedica>(EMPTY_EVAL);
  const [estado, setEstado] = useState('apto');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }
    loadCandidatos();
  }

  async function loadCandidatos() {
    setLoading(true);
    const { data } = await supabase
      .from('candidatos')
      .select('*')
      .eq('veredicto_final', 'Apto para Entrevista')
      .order('created_at', { ascending: false });
    setCandidatos(data ?? []);
    setLoading(false);
  }

  function openEval(c: Candidato) {
    setSelected(c);
    const existing = c.evaluacion_medica as EvalMedica | null;
    setEval(existing ?? EMPTY_EVAL);
    setEstado(c.estado_medico ?? 'apto');
    setSaved(false);
    setError(null);
  }

  async function saveEval() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from('candidatos')
      .update({
        evaluacion_medica: eval_,
        estado_medico: estado,
        fecha_evaluacion_medica: new Date().toISOString(),
      })
      .eq('id', selected.id);
    if (e) setError(e.message);
    else {
      setSaved(true);
      loadCandidatos();
    }
    setSaving(false);
  }

  const estadoColor = (e: string) =>
    e === 'apto' ? '#4CAF50' : e === 'observaciones' ? '#FFC107' : '#D32F2F';

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700, letterSpacing: '1px' }}>MA BAKER & CHEF</div>
            <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>Evaluación Médica</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', marginBottom: 20 }}>
          <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
            Candidatos <strong>Aptos para Entrevista</strong> pendientes de evaluación médica.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Cargando...</div>
        ) : candidatos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>No hay candidatos aptos para evaluar.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {candidatos.map((c) => {
              const estadoMed = c.estado_medico;
              return (
                <div
                  key={c.id}
                  onClick={() => openEval(c)}
                  style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 120px 100px',
                    gap: 12,
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: '1.5px solid transparent',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D7282F'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre || '—'}</div>
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('es-MX') : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#666' }}>{c.puesto_aplicado || '—'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#4CAF50', textAlign: 'center' }}>
                    {c.puntaje_evaluacion_tecnica ?? '—'}%
                  </div>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${estadoColor(estadoMed ?? 'pendiente')}18`,
                      color: estadoColor(estadoMed ?? 'pendiente'),
                    }}>
                      {estadoMed === 'apto' ? 'APTO' : estadoMed === 'observaciones' ? 'OBS' : estadoMed === 'no_apto' ? 'NO APTO' : 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Evaluación: {selected.nombre}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {([
                ['Visión (20/20)', 'vision', 'e.g. 20/20'],
                ['Audición', 'audicion', 'e.g. Normal'],
                ['Glucosa (mg/dL)', 'glucosa', 'e.g. 95'],
                ['Presión (mmHg)', 'presion', 'e.g. 120/80'],
                ['IMC', 'imc', 'e.g. 22.5'],
              ] as [string, keyof EvalMedica, string][]).map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 4, letterSpacing: '0.5px' }}>
                    {label.toUpperCase()}
                  </label>
                  <input
                    value={eval_[key]}
                    onChange={(e) => setEval((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={ph}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 4, letterSpacing: '0.5px' }}>
                OBSERVACIONES
              </label>
              <textarea
                value={eval_.observaciones}
                onChange={(e) => setEval((prev) => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Notas médicas adicionales..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #E0E0E0', fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8, letterSpacing: '0.5px' }}>
                DICTAMEN MÉDICO
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {ESTADO_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setEstado(opt.value)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: `2px solid ${estado === opt.value ? opt.color : '#E0E0E0'}`,
                      background: estado === opt.value ? `${opt.color}18` : '#fff',
                      color: estado === opt.value ? opt.color : '#999',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(211,47,47,0.08)', border: '1.5px solid rgba(211,47,47,0.3)', borderRadius: 8, padding: '10px 14px', color: '#D32F2F', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            {saved && (
              <div style={{ background: 'rgba(76,175,80,0.08)', border: '1.5px solid rgba(76,175,80,0.3)', borderRadius: 8, padding: '10px 14px', color: '#4CAF50', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
                ✓ Evaluación guardada correctamente.
              </div>
            )}

            <button
              onClick={saveEval}
              disabled={saving}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 10,
                border: 'none',
                background: saving ? '#ccc' : 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Guardando...' : 'Guardar Evaluación Médica'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
