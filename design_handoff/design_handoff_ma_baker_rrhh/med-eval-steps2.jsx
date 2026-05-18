// ═══════════════════════════════════════════════════════════════════
// PASOS 5-7: ANTIDOPING, HAM-A, HAM-D
// ═══════════════════════════════════════════════════════════════════

const { Card: _C, Btn: _B, Field: _F, Input: _I, Banner: _Bn } = window.MedUI;
const { useState: uS2, useMemo: uM2 } = React;

// ───────── 5) ANTIDOPING ─────────
function StepAntidoping({ data, onChange, onNext, onBack }) {
  const a = data.antidoping || {};
  const set = (k, v) => onChange({ ...data, antidoping: { ...a, [k]: v } });
  const complete = M.ANTIDOPING_PANELS.every(p => a[p.id]);
  const positives = M.ANTIDOPING_PANELS.filter(p => a[p.id] === 'positivo').length;

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 8 }}>🧪 Antidoping — 5 Paneles SAMHSA</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>Resultado de prueba de tirilla / laboratorio externo. Cutoffs estándar.</p>

      {M.ANTIDOPING_PANELS.map(p => (
        <div key={p.id} style={{ background: '#FAFAFA', padding: 14, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#666' }}>Cutoff: {p.cutoff}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['negativo','positivo','invalido'].map(r => (
                <button key={r} onClick={()=>set(p.id, r)} style={{
                  padding: '6px 14px', borderRadius: 6, border: '2px solid',
                  borderColor: a[p.id] === r ? (r==='negativo'?'#4CAF50':r==='positivo'?'#D32F2F':'#FFC107') : '#E0E0E0',
                  background: a[p.id] === r ? (r==='negativo'?'#4CAF50':r==='positivo'?'#D32F2F':'#FFC107') : '#fff',
                  color: a[p.id] === r ? '#fff' : '#333',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize'
                }}>{r}</button>
              ))}
            </div>
          </div>
        </div>
      ))}

      {positives > 0 && (
        <_Bn type="danger">⚠️ {positives} panel(es) positivo(s). Esto se reflejará en el veredicto final.</_Bn>
      )}

      <_F label="Observaciones del laboratorio">
        <textarea value={a.observaciones || ''} onChange={e=>set('observaciones', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #E0E0E0', minHeight: 60, fontFamily: 'inherit', fontSize: 13 }} />
      </_F>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <_B variant="secondary" onClick={onBack} style={{ flex: 1 }}>← Atrás</_B>
        <_B variant="medical" disabled={!complete} onClick={onNext} style={{ flex: 2 }}>Continuar →</_B>
      </div>
    </div>
  );
}

// ───────── 6) HAMILTON ANSIEDAD (HAM-A) ─────────
function StepHAMA({ data, onChange, onNext, onBack }) {
  const h = data.hama || {};
  const set = (id, v) => onChange({ ...data, hama: { ...h, [id]: v } });
  const score = uM2(() => M.HAMA_ITEMS.reduce((s, it) => s + (h[it.id] ?? 0), 0), [h]);
  const interp = M.hamaInterpretation(score);
  const complete = M.HAMA_ITEMS.every(it => h[it.id] !== undefined);

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 8 }}>🧠 Escala Hamilton de Ansiedad (HAM-A)</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>14 ítems · Escala 0 (Ausente) a 4 (Muy grave) · Total 0-56</p>

      <div style={{ position: 'sticky', top: 0, background: interp.color + '22', border: `2px solid ${interp.color}`, padding: 12, borderRadius: 8, marginBottom: 16, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Puntaje: {score} / 56</strong>
          <span style={{ color: interp.color, fontWeight: 700, fontSize: 13 }}>{interp.level}</span>
        </div>
      </div>

      {M.HAMA_ITEMS.map(it => (
        <div key={it.id} style={{ background: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{it.id}. {it.label}</div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{it.desc}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {M.HAMA_OPTIONS.map(o => (
              <button key={o.v} onClick={()=>set(it.id, o.v)} style={{
                padding: '8px 4px', borderRadius: 4, border: '1px solid',
                borderColor: h[it.id] === o.v ? '#0071BC' : '#E0E0E0',
                background: h[it.id] === o.v ? '#0071BC' : '#fff',
                color: h[it.id] === o.v ? '#fff' : '#333',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>{o.v}<br/><span style={{ fontSize: 9, fontWeight: 400 }}>{o.label}</span></button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <_B variant="secondary" onClick={onBack} style={{ flex: 1 }}>← Atrás</_B>
        <_B variant="medical" disabled={!complete} onClick={()=>onNext({ score, interp })} style={{ flex: 2 }}>Continuar →</_B>
      </div>
    </div>
  );
}

// ───────── 7) HAMILTON DEPRESIÓN (HAM-D) ─────────
function StepHAMD({ data, onChange, onNext, onBack }) {
  const h = data.hamd || {};
  const set = (id, v) => onChange({ ...data, hamd: { ...h, [id]: v } });
  const score = uM2(() => M.HAMD_ITEMS.reduce((s, it) => s + (h[it.id] ?? 0), 0), [h]);
  const interp = M.hamdInterpretation(score);
  const complete = M.HAMD_ITEMS.every(it => h[it.id] !== undefined);
  const suicidio = h[3] >= 2;

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 8 }}>💭 Escala Hamilton de Depresión (HAM-D)</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 16 }}>17 ítems · Puntajes variables (0-2 o 0-4)</p>

      <div style={{ position: 'sticky', top: 0, background: interp.color + '22', border: `2px solid ${interp.color}`, padding: 12, borderRadius: 8, marginBottom: 16, zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Puntaje: {score} / 52</strong>
          <span style={{ color: interp.color, fontWeight: 700, fontSize: 13 }}>{interp.level}</span>
        </div>
        {suicidio && <div style={{ marginTop: 8, padding: 8, background: '#D32F2F', color: '#fff', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>🚨 ALERTA: Ideación suicida activa — derivar a urgencias psiquiátricas</div>}
      </div>

      {M.HAMD_ITEMS.map(it => (
        <div key={it.id} style={{ background: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 8, border: it.alert && h[it.id] >= 2 ? '2px solid #D32F2F' : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
            {it.id}. {it.label} {it.alert && '⚠️'}
            <span style={{ fontSize: 11, color: '#666', fontWeight: 400, marginLeft: 8 }}>(0–{it.max})</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${it.max+1}, 1fr)`, gap: 4 }}>
            {Array.from({length: it.max+1}, (_, i) => (
              <button key={i} onClick={()=>set(it.id, i)} style={{
                padding: '8px 4px', borderRadius: 4, border: '1px solid',
                borderColor: h[it.id] === i ? '#0071BC' : '#E0E0E0',
                background: h[it.id] === i ? '#0071BC' : '#fff',
                color: h[it.id] === i ? '#fff' : '#333',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
              }}>{i}</button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <_B variant="secondary" onClick={onBack} style={{ flex: 1 }}>← Atrás</_B>
        <_B variant="medical" disabled={!complete} onClick={()=>onNext({ score, interp, suicidio })} style={{ flex: 2 }}>Continuar →</_B>
      </div>
    </div>
  );
}

window.MedSteps2 = { StepAntidoping, StepHAMA, StepHAMD };
