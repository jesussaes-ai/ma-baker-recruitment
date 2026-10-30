'use client';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { ROLE_DATA } from '@/lib/questions';
import { PageShell, Card, Header, Button, ProgressBar } from '@/components/ui';

export default function RolePage() {
  const router = useRouter();
  const { role, setRole } = useCandidateStore();

  const roles = Object.entries(ROLE_DATA) as [string, typeof ROLE_DATA.almacen][];

  return (
    <PageShell>
      <ProgressBar current={1} total={7} />
      <Card>
        <Header title="Selecciona el Puesto" subtitle="Elige el puesto al que deseas aplicar" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {roles.map(([key, data]) => {
            const selected = role === key;
            return (
              <button
                key={key}
                onClick={() => setRole(key)}
                style={{
                  padding: '20px 24px',
                  borderRadius: '12px',
                  border: selected ? 'none' : '2px solid #E0E0E0',
                  background: selected ? '#D7282F' : '#fff',
                  color: selected ? '#fff' : '#1A1A1A',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selected ? '0 8px 24px rgba(215,40,47,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{data.label}</div>
                <div style={{ fontSize: 12, opacity: selected ? 0.85 : 0.6, fontWeight: 500 }}>{data.description}</div>
                <div style={{ fontSize: 11, marginTop: 8, opacity: selected ? 0.8 : 0.5, fontWeight: 500 }}>
                  {data.phyReq}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          variant="primary"
          onClick={() => router.push('/profile')}
          style={{ width: '100%' }}
        >
          Continuar →
        </Button>

        <button
          onClick={() => router.push('/welcome')}
          style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </Card>
    </PageShell>
  );
}
