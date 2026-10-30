'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { DOCUMENTS, PSYCH_QUESTIONS, TECHNICAL_QUESTIONS, ROLE_DATA, getVerdict } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import { PageShell, Card, Alert, Button } from '@/components/ui';

export default function ReportPage() {
  const router = useRouter();
  const store = useCandidateStore();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const roleInfo = ROLE_DATA[store.role as keyof typeof ROLE_DATA];
  const verdict = getVerdict(store.techScore);
  const questions = TECHNICAL_QUESTIONS[store.role] ?? [];

  const docsUploaded = DOCUMENTS.filter((d) => store.documents[d.id]);
  const psychAnswered = Object.keys(store.psychResponses).length;
  const techAnswered = Object.keys(store.techResponses).length;

  async function saveCandidato() {
    setSaving(true);
    setSaveError(null);

    const cleanDocs: Record<string, string> = {};
    for (const [k, v] of Object.entries(store.documents)) {
      if (!v.localOnly) cleanDocs[k] = v.url;
    }

    const payload = {
      nombre: store.profile.nombre,
      edad: parseInt(store.profile.edad),
      estatura: parseFloat(store.profile.estatura),
      peso: parseFloat(store.profile.peso),
      genero: store.profile.genero,
      correo: store.profile.correo || null,
      puesto_aplicado: roleInfo.label,
      documentos: cleanDocs,
      requisitos_salud: Object.entries(store.healthChecks).filter(([, v]) => v).map(([k]) => k),
      respuestas_psicometricas: store.psychResponses,
      respuestas_tecnicas: store.techResponses,
      puntaje_evaluacion_tecnica: store.techScore,
      veredicto_final: store.verdict,
      timestamp: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('candidatos').insert(payload).select('id').single();
      if (error) throw error;
      store.setSavedId(data.id);
      // Fire-and-forget notification (non-blocking)
      supabase.functions.invoke('notify-candidate', {
        body: {
          nombre: payload.nombre,
          correo: payload.correo,
          puesto: payload.puesto_aplicado,
          veredicto: payload.veredicto_final,
          puntaje: payload.puntaje_evaluacion_tecnica,
          id: data.id,
        },
      }).catch(() => { /* notifications are best-effort */ });
      router.push('/success');
    } catch (err: unknown) {
      // retry with minimal payload
      try {
        const minimal = {
          nombre: payload.nombre,
          edad: payload.edad,
          puesto_aplicado: payload.puesto_aplicado,
          puntaje_evaluacion_tecnica: payload.puntaje_evaluacion_tecnica,
          veredicto_final: payload.veredicto_final,
          timestamp: payload.timestamp,
        };
        const { data, error: err2 } = await supabase.from('candidatos').insert(minimal).select('id').single();
        if (err2) throw err2;
        store.setSavedId(data.id);
        supabase.functions.invoke('notify-candidate', {
          body: {
            nombre: minimal.nombre,
            correo: payload.correo,
            puesto: minimal.puesto_aplicado,
            veredicto: minimal.veredicto_final,
            puntaje: minimal.puntaje_evaluacion_tecnica,
            id: data.id,
          },
        }).catch(() => { /* notifications are best-effort */ });
        router.push('/success');
      } catch (err2: unknown) {
        setSaveError(err2 instanceof Error ? err2.message : 'Error al guardar. Verifica tu conexión.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{verdict.emoji}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>Reporte Final</h2>
          <div style={{ fontSize: 18, fontWeight: 700, color: verdict.color }}>{store.techScore}% — {verdict.label}</div>
        </div>

        <Section title="👤 Perfil">
          <Row label="Nombre" value={store.profile.nombre} />
          <Row label="Puesto" value={roleInfo.label} />
          <Row label="Edad" value={`${store.profile.edad} años`} />
          <Row label="Género" value={store.profile.genero === 'M' ? 'Masculino' : 'Femenino'} />
          <Row label="Estatura" value={`${store.profile.estatura} cm`} />
          <Row label="Peso" value={`${store.profile.peso} kg`} />
        </Section>

        <Section title="📄 Documentos">
          {DOCUMENTS.map((d) => (
            <Row key={d.id} label={d.name} value={store.documents[d.id] ? '✅ Cargado' : '❌ Pendiente'} />
          ))}
        </Section>

        <Section title="🧠 Psicometría">
          <Row label="Preguntas respondidas" value={`${psychAnswered} / ${PSYCH_QUESTIONS.length}`} />
        </Section>

        <Section title="🔧 Evaluación Técnica">
          <Row label="Preguntas respondidas" value={`${techAnswered} / ${questions.length}`} />
          <Row label="Puntaje" value={`${store.techScore}%`} />
          {questions.map((q, i) => {
            const userAns = store.techResponses[i];
            const isCorrect = userAns === q.correct;
            return (
              <div key={i} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F0F0F0' }}>
                <span style={{ color: isCorrect ? '#4CAF50' : '#D32F2F', fontWeight: 700 }}>{isCorrect ? '✓' : '✗'}</span>
                {' '}{q.text.substring(0, 50)}…
              </div>
            );
          })}
        </Section>

        {saveError && <Alert type="danger" style={{ marginBottom: 16 }}>{saveError}</Alert>}

        <Button
          variant="success"
          onClick={saveCandidato}
          disabled={saving}
          style={{ width: '100%', fontSize: 15, padding: '14px 24px' }}
        >
          {saving ? '⏳ Guardando...' : '✅ Guardar en Supabase'}
        </Button>

        <button
          onClick={() => router.push('/technical')}
          style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </Card>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#D7282F', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #F0F0F0' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, borderBottom: '1px solid #F5F5F5' }}>
      <span style={{ color: '#666', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#1A1A1A', fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
