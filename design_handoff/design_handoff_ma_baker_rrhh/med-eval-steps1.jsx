// ═══════════════════════════════════════════════════════════════════
// PASOS DE LA EVALUACIÓN MÉDICA
// ═══════════════════════════════════════════════════════════════════

const { Card, Btn, Field, Input, Banner } = window.MedUI;
const { useState: uS, useMemo: uM } = React;

// ───────── 1) LOGIN MÉDICO ─────────
function StepLogin({ onLogin }) {
  const [name, setName] = uS('');
  const [cedula, setCedula] = uS('');
  const [err, setErr] = uS('');
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 8 }}>Acceso restringido</h2>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>Solo personal médico autorizado. Esta sección procesa datos sensibles de salud bajo cumplimiento LFPDPPP y NOM-035.</p>
      <Field label="Nombre del médico evaluador"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Dra. María González" /></Field>
      <Field label="Cédula profesional"><Input value={cedula} onChange={e=>setCedula(e.target.value)} placeholder="12345678" /></Field>
      <Btn variant="medical" disabled={!name || cedula.length < 6} onClick={()=>{
        if (cedula.length < 6) return setErr('Cédula inválida');
        onLogin({ name, cedula });
      }} style={{ width: '100%', marginTop: 12 }}>Ingresar al Búnker Médico →</Btn>
      {err && <Banner type="danger">{err}</Banner>}
    </div>
  );
}

// ───────── 2) AVISO DE PRIVACIDAD DATOS SENSIBLES ─────────
function StepPrivacy({ doctor, onAccept, onCancel }) {
  const [accepted, setAccepted] = uS(false);
  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 16 }}>📜 Aviso de Privacidad — Datos Sensibles</h2>
      <Banner type="warning">
        <strong>Bloqueo Legal 3 (LFPDPPP Art. 9):</strong> El procesamiento de datos clínicos requiere consentimiento expreso y por escrito.
      </Banner>
      <div style={{ background: '#FAFAFA', border: '1px solid #E0E0E0', borderRadius: 8, padding: 16, fontSize: 12, lineHeight: 1.7, margin: '16px 0', maxHeight: 280, overflow: 'auto' }}>
        <p><strong>Responsable:</strong> Ma Baker and Chef S.A. de C.V.</p>
        <p><strong>Datos sensibles recabados:</strong> Signos vitales, antidoping (5 paneles), escalas psiquiátricas (HAM-A, HAM-D), antecedentes médicos, evaluación funcional 5 D's.</p>
        <p><strong>Finalidad primaria:</strong> Determinar aptitud médica para puesto de trabajo (APTO / NO APTO / CONDICIONADO).</p>
        <p><strong>Finalidad secundaria:</strong> Expediente médico ocupacional bajo NOM-035-STPS-2018 y NOM-030-STPS-2009.</p>
        <p><strong>Transferencias:</strong> Sólo el veredicto se comparte con Recursos Humanos. Los datos clínicos brutos permanecen encriptados y accesibles únicamente al médico ocupacional.</p>
        <p><strong>Derechos ARCO:</strong> Puede ejercerlos en privacidad@mabaker.mx</p>
        <p><strong>Conservación:</strong> 5 años posteriores al término de la relación laboral.</p>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 14, background: '#FFF8E1', borderRadius: 8, marginBottom: 16 }}>
        <input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Como médico evaluador certifico que el candidato firmó el aviso físico previo a esta consulta.</span>
      </label>
      <div style={{ display: 'flex', gap: 12 }}>
        <Btn variant="secondary" onClick={onCancel} style={{ flex: 1 }}>← Cancelar</Btn>
        <Btn variant="medical" disabled={!accepted} onClick={()=>onAccept(new Date().toISOString())} style={{ flex: 2 }}>Acepto y continúo →</Btn>
      </div>
    </div>
  );
}

// ───────── 3) SELECTOR DE CANDIDATO ─────────
function StepSelectCandidate({ onSelect, onBack }) {
  const [list, setList] = uS([]);
  const [loading, setLoading] = uS(true);
  const [err, setErr] = uS(null);
  const [search, setSearch] = uS('');
  const [manualMode, setManualMode] = uS(false);
  const [manual, setManual] = uS({ nombre: '', edad: '', puesto_aplicado: 'Auxiliar de Almacén' });

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('Formulario de Candidatos')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
        if (error) throw error;
        setList(data || []);
      } catch (e) {
        const msg = e.message || String(e);
        if (msg.includes('Failed to fetch') && window.self !== window.top) {
          setErr('La previsualización bloquea Supabase. Puedes crear un candidato manual abajo para probar el flujo.');
        } else setErr(msg);
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered = list.filter(c => !search || (c.nombre || '').toUpperCase().includes(search.toUpperCase()));

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 16 }}>👤 Seleccionar candidato a evaluar</h2>
      <Input
        placeholder="🔍 BUSCAR POR NOMBRE…"
        value={search}
        onChange={e=>setSearch(e.target.value.toUpperCase())}
        style={{ marginBottom: 16, textTransform: 'uppercase' }}
      />
      {loading && <Banner type="info">Cargando candidatos…</Banner>}
      {err && <Banner type="warning">{err}</Banner>}
      {!loading && !err && filtered.length === 0 && <Banner type="warning">No hay candidatos registrados.</Banner>}
      <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflow: 'auto' }}>
        {filtered.map(c => (
          <div key={c.id} onClick={()=>onSelect(c)} style={{
            background: '#FAFAFA', padding: 14, borderRadius: 8, cursor: 'pointer',
            border: '2px solid transparent', transition: 'all .2s'
          }} onMouseEnter={e=>e.currentTarget.style.borderColor='#0071BC'} onMouseLeave={e=>e.currentTarget.style.borderColor='transparent'}>
            <div style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>{c.nombre || '— Sin nombre'}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              {c.puesto_aplicado || '—'} · {c.edad || '?'} años · Veredicto técnico: <strong>{c.veredicto_final || '—'}</strong>
            </div>
          </div>
        ))}
      </div>

      <details style={{ marginTop: 16, padding: 12, background: '#FFF8E1', borderRadius: 8 }} open={!!err}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>➕ Crear candidato manual (modo prueba / offline)</summary>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <Input placeholder="NOMBRE COMPLETO" value={manual.nombre} onChange={e=>setManual({...manual, nombre: e.target.value.toUpperCase()})} style={{ textTransform: 'uppercase' }} />
          <Input type="number" placeholder="EDAD" value={manual.edad} onChange={e=>setManual({...manual, edad: e.target.value})} />
          <select value={manual.puesto_aplicado} onChange={e=>setManual({...manual, puesto_aplicado: e.target.value})} style={{ padding: 10, borderRadius: 6, border: '1px solid #E0E0E0', fontSize: 13, fontFamily: 'inherit' }}>
            <option>Auxiliar de Almacén</option>
            <option>Mezclador</option>
          </select>
          <Btn variant="medical" disabled={!manual.nombre || !manual.edad} onClick={()=>onSelect({ id: 'manual_' + Date.now(), ...manual })}>
            Continuar con candidato manual →
          </Btn>
        </div>
      </details>

      <Btn variant="secondary" onClick={onBack} style={{ marginTop: 16 }}>← Volver</Btn>
    </div>
  );
}

// ───────── 4) SIGNOS VITALES ─────────
function StepVitals({ data, onChange, onNext, onBack }) {
  const v = data.vitals || {};
  const set = (k, val) => onChange({ ...data, vitals: { ...v, [k]: val } });
  const imc = uM(() => {
    const h = parseFloat(v.altura) / 100;
    const w = parseFloat(v.peso);
    if (!h || !w) return null;
    return (w / (h*h)).toFixed(1);
  }, [v.altura, v.peso]);
  const imcInfo = imc ? M.imcClass(parseFloat(imc)) : null;
  const required = ['fc','fr','tas','tad','temp','spo2','altura','peso'];
  const complete = required.every(k => v[k]);

  const VitalInput = ({ id }) => {
    const r = M.VITALS_RANGES[id];
    const val = parseFloat(v[id]);
    const outOfRange = val && (val < r.min || val > r.max);
    return (
      <Field label={r.label} hint={`Rango normal: ${r.min}–${r.max} ${r.unit}`}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input type="number" step="0.1" value={v[id] || ''} onChange={e=>set(id, e.target.value)} style={{ borderColor: outOfRange ? '#D32F2F' : '#E0E0E0' }} />
          <span style={{ fontSize: 12, color: '#666', minWidth: 40 }}>{r.unit}</span>
        </div>
        {outOfRange && <div style={{ fontSize: 11, color: '#D32F2F', marginTop: 4 }}>⚠ Fuera de rango normal</div>}
      </Field>
    );
  };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ marginBottom: 16 }}>❤️ Signos Vitales & Antropometría</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <VitalInput id="fc" />
        <VitalInput id="fr" />
        <VitalInput id="tas" />
        <VitalInput id="tad" />
        <VitalInput id="temp" />
        <VitalInput id="spo2" />
        <Field label="Altura (cm)"><Input type="number" value={v.altura || ''} onChange={e=>set('altura', e.target.value)} /></Field>
        <Field label="Peso (kg)"><Input type="number" step="0.1" value={v.peso || ''} onChange={e=>set('peso', e.target.value)} /></Field>
      </div>
      {imc && (
        <div style={{ background: imcInfo.color + '22', border: `2px solid ${imcInfo.color}`, padding: 12, borderRadius: 8, marginTop: 8 }}>
          <strong>IMC: {imc}</strong> · <span style={{ color: imcInfo.color }}>{imcInfo.class}</span>
        </div>
      )}
      <Field label="Observaciones (auscultación, exploración general)"  >
        <textarea value={v.observaciones || ''} onChange={e=>set('observaciones', e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #E0E0E0', minHeight: 80, fontFamily: 'inherit', fontSize: 13 }} />
      </Field>
      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <Btn variant="secondary" onClick={onBack} style={{ flex: 1 }}>← Atrás</Btn>
        <Btn variant="medical" disabled={!complete} onClick={()=>onNext({ imc, imcClass: imcInfo?.class })} style={{ flex: 2 }}>Continuar →</Btn>
      </div>
    </div>
  );
}

window.MedSteps = { StepLogin, StepPrivacy, StepSelectCandidate, StepVitals };
