'use client';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { ROLE_DATA } from '@/lib/questions';
import { PageShell, Card, Header, Button, ProgressBar, Alert, InputField } from '@/components/ui';

export default function ProfilePage() {
  const router = useRouter();
  const { role, profile, setProfile } = useCandidateStore();
  const roleInfo = ROLE_DATA[role as keyof typeof ROLE_DATA];

  const edad = parseInt(profile.edad || '0');
  const ageWarning = profile.edad && (edad < roleInfo.ageMin || edad > roleInfo.ageMax);

  const isValid = profile.nombre.trim() && profile.edad && profile.estatura && profile.peso && profile.genero;

  return (
    <PageShell>
      <ProgressBar current={2} total={7} />
      <Card>
        <Header title="Perfil del Candidato" subtitle={`Puesto: ${roleInfo.label}`} />

        {ageWarning && (
          <Alert type="warning" style={{ marginBottom: 20 }}>
            ⚠️ Edad fuera del rango recomendado ({roleInfo.ageMin}–{roleInfo.ageMax} años). Puedes continuar.
          </Alert>
        )}

        <InputField
          label="NOMBRE COMPLETO"
          value={profile.nombre}
          onChange={(v) => setProfile({ nombre: v })}
          placeholder="NOMBRE COMPLETO"
          required
        />

        <InputField
          label="EDAD"
          type="number"
          value={profile.edad}
          onChange={(v) => setProfile({ edad: v })}
          placeholder="AÑOS"
          required
          min={18}
          max={65}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <InputField
            label="ESTATURA (cm)"
            type="number"
            value={profile.estatura}
            onChange={(v) => setProfile({ estatura: v })}
            placeholder="CM"
            required
            min={130}
            max={220}
          />
          <InputField
            label="PESO (kg)"
            type="number"
            value={profile.peso}
            onChange={(v) => setProfile({ peso: v })}
            placeholder="KG"
            required
            min={40}
            max={200}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6 }}>
            GÉNERO <span style={{ color: '#D7282F' }}>*</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {['M', 'F'].map((g) => (
              <button
                key={g}
                onClick={() => setProfile({ genero: g })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: profile.genero === g ? 'none' : '1.5px solid #E0E0E0',
                  background: profile.genero === g ? '#D7282F' : '#fff',
                  color: profile.genero === g ? '#fff' : '#1A1A1A',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {g === 'M' ? 'MASCULINO' : 'FEMENINO'}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => router.push('/documents')}
          disabled={!isValid}
          style={{ width: '100%' }}
        >
          Continuar →
        </Button>
        <button
          onClick={() => router.push('/role')}
          style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </Card>
    </PageShell>
  );
}
