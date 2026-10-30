'use client';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { getVerdict } from '@/lib/questions';

const messages: Record<string, string> = {
  'Apto para Entrevista': 'RRHH te contactará en las próximas 48 horas para agendar tu entrevista.',
  'Evaluación Adicional': 'Tu expediente pasará a revisión manual por el equipo de RRHH.',
  'No cumple perfil': 'Hemos registrado tu información. Gracias por participar.',
};

export default function SuccessPage() {
  const router = useRouter();
  const { techScore, verdict, savedId, profile, reset } = useCandidateStore();
  const v = getVerdict(techScore);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 40,
          maxWidth: 420,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
        }}
        className="animate-slideIn"
      >
        <div style={{ fontSize: 64, marginBottom: 16 }}>{v.emoji}</div>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>
          ¡Evaluación Completada!
        </h2>
        <div style={{ fontSize: 15, color: '#666', marginBottom: 24 }}>
          {profile.nombre || 'Candidato'}
        </div>

        <div
          style={{
            background: '#F9F9F9',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 24,
            border: `2px solid ${v.color}22`,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700, color: v.color, marginBottom: 4 }}>{techScore}%</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: v.color, marginBottom: 12 }}>{verdict}</div>
          {savedId && (
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>
              ID de registro: #{savedId}
            </div>
          )}
        </div>

        <div
          style={{
            background: `${v.color}11`,
            border: `1.5px solid ${v.color}44`,
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 28,
            fontSize: 14,
            color: '#1A1A1A',
            lineHeight: 1.5,
          }}
        >
          {messages[verdict] ?? 'Gracias por completar el proceso.'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { reset(); router.push('/welcome'); }}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#D7282F',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Nueva Evaluación
          </button>
          <button
            onClick={() => router.push('/report')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1.5px solid #D7282F',
              background: 'transparent',
              color: '#D7282F',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Ver Reporte
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#F5F5F5',
              color: '#0071BC',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Dashboard RRHH →
          </button>
        </div>
      </div>
    </div>
  );
}
