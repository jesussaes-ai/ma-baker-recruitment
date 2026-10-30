// ═══════════════════════════════════════════════════════════════════
// PASOS 8-9: 5 D's + VEREDICTO FINAL
// ═══════════════════════════════════════════════════════════════════

const { Btn: __B, Field: __F, Input: __I, Banner: __Bn } = window.MedUI;
const { useState: uS3, useMemo: uM3 } = React;

// ───────── 8) EVALUACIÓN FUNCIONAL 5 D's ─────────
function Step5Ds({ data, onChange, onNext, onBack }) {
  const d = data.cincoDs || {};
  const set = (k, v) => onChange({ ...data, cincoDs: { ...d, [k]: v } });
  const total = uM3(() => M.CINCO_DS.reduce((s, item) => s + (d[item.id] ?? 0), 0), [d]);
  const complete = M.CINCO_DS.every(it => d[it.id] !== undefined);
  const maxScore = M.CINCO_DS.length * 4; // 20

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 8 }}>🎯 Evaluación Funcional 5 D's</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>
        Modelo clínico: <strong>Dolor · Discapacidad · Disconfort · Drogas · Riesgo vital</strong>. Escala 0-4 por dimensión.
      </p>

      <div style={{ position: 'sticky', top: 0, background: total <= 5 ? '#4CAF5022' : total <= 10 ? '#FFC10722' : '#D32F2F22', border: `2px solid ${total <= 5 ? '#4CAF50' : total <= 10 ? '#FFC107' : '#D32F2F'}`, padding: 12, borderRadius: 8, marginBottom: 16, zIndex: 10 }}>
        <strong style={{ fontSize: 14 }}>Puntaje funcional: {total} / {maxScore}</strong>
        <span style={{ marginLeft: 12, fontSize: 12 }}>
          {total <= 5 ? '✓ Funcional' : total <= 10 ? '⚠ Funcional con observaciones' : '✗ Compromiso funcional'}
        </span>
      </div>

      {M.CINCO_DS.map(item => (
        <div key={item.id} style={{ background: '#FAFAFA', padding: 14, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{item.label}</div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 10 }}>{item.desc}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {item.scale.map((s, i) => (
              <button key={i} onClick={()=>set(item.id, i)} style={{
                padding: '10px 4px', borderRadius: 4, border: '1px solid',
                borderColor: d[item.id] === i ? '#0071BC' : '#E0E0E0',
                background: d[item.id] === i ? '#0071BC' : '#fff',
                color: d[item.id] === i ? '#fff' : '#333',
                fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.3
              }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>{i}</div>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}

      <__F label="Observaciones funcionales del médico evaluador">
        <textarea value={d.observaciones || ''} onChange={e=>set('observaciones', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #E0E0E0', minHeight: 80, fontFamily: 'inherit', fontSize: 13 }} />
      </__F>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <__B variant="secondary" onClick={onBack} style={{ flex: 1 }}>← Atrás</__B>
        <__B variant="medical" disabled={!complete} onClick={()=>onNext({ total })} style={{ flex: 2 }}>Ver veredicto →</__B>
      </div>
    </div>
  );
}

// ───────── 9) VEREDICTO FINAL ─────────
function calcularVeredicto(data) {
  const reasons = [];
  let level = 'APTO'; // APTO | CONDICIONADO | NO APTO

  // Antidoping
  const positivos = M.ANTIDOPING_PANELS.filter(p => data.antidoping?.[p.id] === 'positivo');
  const invalidos = M.ANTIDOPING_PANELS.filter(p => data.antidoping?.[p.id] === 'invalido');
  if (positivos.length > 0) {
    level = 'NO APTO';
    reasons.push(`Antidoping POSITIVO en: ${positivos.map(p=>p.name).join(', ')}`);
  }
  if (invalidos.length > 0 && level === 'APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Antidoping inválido en ${invalidos.length} panel(es) — repetir prueba`);
  }

  // HAM-D suicidio
  if (data.hamd?.[3] >= 2) {
    level = 'NO APTO';
    reasons.push('Ideación suicida activa (HAM-D ítem 3 ≥ 2) — requiere atención psiquiátrica');
  }

  // HAM-A
  const hama = M.HAMA_ITEMS.reduce((s,it)=>s+(data.hama?.[it.id]??0),0);
  const hamaI = M.hamaInterpretation(hama);
  if (hama > 30) {
    level = 'NO APTO';
    reasons.push(`Ansiedad muy grave (HAM-A ${hama}/56)`);
  } else if (hama >= 25 && level !== 'NO APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Ansiedad grave (HAM-A ${hama}/56) — seguimiento psicológico`);
  } else if (hama >= 18 && level === 'APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Ansiedad moderada (HAM-A ${hama}/56) — observación`);
  }

  // HAM-D
  const hamd = M.HAMD_ITEMS.reduce((s,it)=>s+(data.hamd?.[it.id]??0),0);
  if (hamd >= 23) {
    level = 'NO APTO';
    reasons.push(`Depresión muy grave (HAM-D ${hamd}/52)`);
  } else if (hamd >= 19 && level !== 'NO APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Depresión grave (HAM-D ${hamd}/52)`);
  } else if (hamd >= 14 && level === 'APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Depresión moderada (HAM-D ${hamd}/52)`);
  }

  // 5 D's
  const totalDs = M.CINCO_DS.reduce((s,it)=>s+(data.cincoDs?.[it.id]??0),0);
  if (data.cincoDs?.defuncion >= 3) {
    level = 'NO APTO';
    reasons.push('Riesgo vital alto/inminente (5 D\'s)');
  } else if (totalDs > 10 && level === 'APTO') {
    level = 'CONDICIONADO';
    reasons.push(`Compromiso funcional general (5 D's: ${totalDs}/20)`);
  }

  // Signos vitales fuera de rango crítico
  const v = data.vitals || {};
  if (parseFloat(v.tas) > 160 || parseFloat(v.tad) > 100) {
    if (level === 'APTO') level = 'CONDICIONADO';
    reasons.push(`Hipertensión arterial (${v.tas}/${v.tad} mmHg)`);
  }
  if (parseFloat(v.spo2) < 92) {
    level = 'NO APTO';
    reasons.push(`Hipoxia (SpO₂ ${v.spo2}%)`);
  }

  // IMC extremo
  const imc = parseFloat(v.altura) > 0 && parseFloat(v.peso) > 0 ? parseFloat(v.peso) / Math.pow(parseFloat(v.altura)/100, 2) : null;
  if (imc && imc >= 40) {
    if (level === 'APTO') level = 'CONDICIONADO';
    reasons.push(`Obesidad III (IMC ${imc.toFixed(1)})`);
  }

  if (reasons.length === 0) reasons.push('Todos los parámetros dentro de límites normales');

  return { level, reasons, scores: { hama, hamd, totalDs, imc: imc?.toFixed(1) } };
}

function StepVeredicto({ data, candidate, doctor, onBack, onSave, onFinish }) {
  const veredicto = uM3(() => calcularVeredicto(data), [data]);
  const [saving, setSaving] = uS3(false);
  const [saved, setSaved] = uS3(null);
  const [override, setOverride] = uS3(null);
  const [notas, setNotas] = uS3('');

  const finalLevel = override || veredicto.level;
  const color = finalLevel === 'APTO' ? '#4CAF50' : finalLevel === 'CONDICIONADO' ? '#FFC107' : '#D32F2F';

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave({
        ...data,
        veredicto_medico: finalLevel,
        veredicto_motivos: veredicto.reasons,
        veredicto_scores: veredicto.scores,
        veredicto_override: override,
        notas_medicas: notas,
        evaluado_por: doctor,
        fecha_evaluacion: new Date().toISOString(),
      });
      setSaved(result);
    } catch (e) {
      setSaved({ error: e.message });
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 16 }}>📋 Veredicto Médico Final</h2>

      <div style={{ background: color + '22', border: `3px solid ${color}`, padding: 20, borderRadius: 12, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>VEREDICTO CLÍNICO</div>
        <div style={{ fontSize: 36, fontWeight: 900, color }}>{finalLevel}</div>
        {override && <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>(sobrescrito manualmente — automático: {veredicto.level})</div>}
      </div>

      <div style={{ background: '#FAFAFA', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Justificación clínica</h3>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
          {veredicto.reasons.map((r,i) => <li key={i}>{r}</li>)}
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'HAM-A', v: `${veredicto.scores.hama}/56` },
          { label: 'HAM-D', v: `${veredicto.scores.hamd}/52` },
          { label: '5 D\'s', v: `${veredicto.scores.totalDs}/20` },
          { label: 'IMC', v: veredicto.scores.imc || '—' },
        ].map((m,i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #E0E0E0', padding: 10, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#666' }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{m.v}</div>
          </div>
        ))}
      </div>

      <__F label="Notas adicionales del médico (visible en expediente clínico)">
        <textarea value={notas} onChange={e=>setNotas(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #E0E0E0', minHeight: 80, fontFamily: 'inherit', fontSize: 13 }} />
      </__F>

      <details style={{ marginBottom: 16, padding: 12, background: '#FFF3E0', borderRadius: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>⚙ Sobrescribir veredicto manualmente</summary>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {['APTO','CONDICIONADO','NO APTO',null].map(o => (
            <button key={o ?? 'auto'} onClick={()=>setOverride(o)} style={{
              padding: '8px 14px', borderRadius: 6, border: '2px solid',
              borderColor: override === o ? '#0071BC' : '#E0E0E0',
              background: override === o ? '#0071BC' : '#fff', color: override === o ? '#fff' : '#333',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
            }}>{o || 'Usar automático'}</button>
          ))}
        </div>
      </details>

      {!saved && (
        <div style={{ display: 'flex', gap: 12 }}>
          <__B variant="secondary" onClick={onBack} disabled={saving} style={{ flex: 1 }}>← Atrás</__B>
          <__B variant="medical" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
            {saving ? '⏳ Guardando…' : '🔒 Firmar y guardar expediente'}
          </__B>
        </div>
      )}

      {saved && saved.error && (
        <__Bn type="danger">Error al guardar: {saved.error}</__Bn>
      )}

      {saved && !saved.error && (
        <>
          <__Bn type="success">
            ✅ Expediente firmado y guardado. Veredicto <strong>{finalLevel}</strong> visible para RH; datos clínicos detallados quedan en el búnker médico.
          </__Bn>
          <__B variant="medical" onClick={onFinish} style={{ width: '100%', marginTop: 12 }}>Evaluar siguiente candidato →</__B>
        </>
      )}
    </div>
  );
}

window.MedSteps3 = { Step5Ds, StepVeredicto, calcularVeredicto };
