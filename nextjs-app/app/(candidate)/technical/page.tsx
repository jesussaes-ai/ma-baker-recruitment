'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { TECHNICAL_QUESTIONS, ROLE_DATA, calcTechScore, getVerdict } from '@/lib/questions';
import { PageShell, Card, ProgressBar, Button, Alert } from '@/components/ui';

export default function TechnicalPage() {
  const router = useRouter();
  const { role, techResponses, setTechResponse, setTechScore, setVerdict } = useCandidateStore();
  const [qIdx, setQIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const questions = TECHNICAL_QUESTIONS[role] ?? [];
  const roleInfo = ROLE_DATA[role as keyof typeof ROLE_DATA];
  const total = questions.length;
  const answered = techResponses[qIdx] !== undefined;

  function handleFinish() {
    const score = calcTechScore(techResponses, role);
    const verdict = getVerdict(score);
    setTechScore(score);
    setVerdict(verdict.label);
    setShowResults(true);
  }

  function handleContinue() {
    router.push('/report');
  }

  if (showResults) {
    const score = calcTechScore(techResponses, role);
    const verdict = getVerdict(score);
    const correct = Object.entries(techResponses).filter(([idx, ans]) => ans === questions[Number(idx)]?.correct).length;

    return (
      <PageShell>
        <ProgressBar current={5} total={7} />
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{verdict.emoji}</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: verdict.color, marginBottom: 4 }}>{score}%</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: verdict.color, marginBottom: 8 }}>{verdict.label}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{correct} de {total} respuestas correctas</div>
          </div>

          {score >= 70 && <Alert type="success" style={{ marginBottom: 20 }}>¡Excelente! Pasas a la siguiente fase del proceso.</Alert>}
          {score >= 50 && score < 70 && <Alert type="warning" style={{ marginBottom: 20 }}>Tu evaluación pasará a revisión adicional por RRHH.</Alert>}
          {score < 50 && <Alert type="danger" style={{ marginBottom: 20 }}>Gracias por participar. Hemos registrado tu información.</Alert>}

          <div style={{ marginBottom: 28 }}>
            {questions.map((q, i) => {
              const userAns = techResponses[i];
              const isCorrect = userAns === q.correct;
              return (
                <div key={i} style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, background: isCorrect ? 'rgba(76,175,80,0.08)' : 'rgba(211,47,47,0.08)', border: `1px solid ${isCorrect ? '#4CAF50' : '#D32F2F'}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 4 }}>P{i + 1}</div>
                  <div style={{ fontSize: 13, color: '#1A1A1A', marginBottom: 4 }}>{q.text}</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: isCorrect ? '#4CAF50' : '#D32F2F', fontWeight: 600 }}>
                      {isCorrect ? '✓' : '✗'} Tu respuesta: {q.options[userAns]}
                    </span>
                    {!isCorrect && (
                      <span style={{ color: '#4CAF50', marginLeft: 8, fontWeight: 600 }}>
                        ✓ Correcta: {q.options[q.correct]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button variant="primary" onClick={handleContinue} style={{ width: '100%' }}>
            Ver Reporte Final →
          </Button>
        </Card>
      </PageShell>
    );
  }

  const question = questions[qIdx];

  return (
    <PageShell>
      <ProgressBar current={5} total={7} />
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.5px' }}>EVALUACIÓN TÉCNICA</div>
            <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600 }}>{roleInfo.label}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#D7282F' }}>{qIdx + 1}/{total}</div>
        </div>

        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.5 }}>{question.text}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {question.options.map((opt, i) => {
            const selected = techResponses[qIdx] === i;
            return (
              <button
                key={i}
                onClick={() => setTechResponse(qIdx, i)}
                style={{
                  padding: '12px 16px', borderRadius: '8px',
                  border: selected ? 'none' : '1.5px solid #E0E0E0',
                  background: selected ? '#D7282F' : '#fff',
                  color: selected ? '#fff' : '#1A1A1A',
                  textAlign: 'left', fontSize: 13,
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {qIdx < total - 1 ? (
          <Button variant="primary" onClick={() => setQIdx((i) => i + 1)} disabled={!answered} style={{ width: '100%' }}>
            Siguiente →
          </Button>
        ) : (
          <Button variant="success" onClick={handleFinish} disabled={!answered} style={{ width: '100%' }}>
            Ver Resultados →
          </Button>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {questions.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === qIdx ? '#D7282F' : techResponses[i] !== undefined ? '#4CAF50' : '#E0E0E0' }} />
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
