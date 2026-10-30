'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { PSYCH_QUESTIONS } from '@/lib/questions';
import { PageShell, Card, ProgressBar, Button } from '@/components/ui';

const TIMER_SECONDS = 90;

export default function PsychPage() {
  const router = useRouter();
  const { psychResponses, setPsychResponse } = useCandidateStore();
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  const total = PSYCH_QUESTIONS.length;
  const question = PSYCH_QUESTIONS[qIdx];
  const answered = psychResponses[qIdx] !== undefined;

  useEffect(() => {
    setTimeLeft(TIMER_SECONDS);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          advance();
          return TIMER_SECONDS;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  function advance() {
    if (qIdx < total - 1) {
      setQIdx((i) => i + 1);
    } else {
      router.push('/technical');
    }
  }

  const timerPct = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft > 30 ? '#4CAF50' : timeLeft > 10 ? '#FFC107' : '#D32F2F';

  return (
    <PageShell>
      <ProgressBar current={4} total={7} />
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.5px' }}>EVALUACIÓN PSICOMÉTRICA</div>
            <div style={{ fontSize: 13, color: '#1A1A1A', fontWeight: 600 }}>Pregunta {qIdx + 1} de {total}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: timerColor }}>{timeLeft}s</div>
            <div style={{ width: 60, height: 4, background: '#E0E0E0', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
              <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
            </div>
          </div>
        </div>

        <div style={{ background: '#F5F5F5', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', lineHeight: 1.5 }}>{question.text}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {question.options.map((opt, i) => {
            const selected = psychResponses[qIdx] === i;
            return (
              <button
                key={i}
                onClick={() => setPsychResponse(qIdx, i)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: selected ? 'none' : '1.5px solid #E0E0E0',
                  background: selected ? '#D7282F' : '#fff',
                  color: selected ? '#fff' : '#1A1A1A',
                  textAlign: 'left',
                  fontSize: 13,
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <Button
          variant="primary"
          onClick={advance}
          disabled={!answered}
          style={{ width: '100%' }}
        >
          {qIdx < total - 1 ? 'Siguiente →' : 'Terminar y continuar →'}
        </Button>

        <div style={{ marginTop: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PSYCH_QUESTIONS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: i === qIdx ? '#D7282F' : psychResponses[i] !== undefined ? '#4CAF50' : '#E0E0E0',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
