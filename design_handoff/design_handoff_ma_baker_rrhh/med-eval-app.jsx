// ═══════════════════════════════════════════════════════════════════
// APP PRINCIPAL — ORQUESTA TODOS LOS PASOS
// ═══════════════════════════════════════════════════════════════════

const { Card: AC, Header: AH, ProgressBar: APB, Banner: ABn } = window.MedUI;
const { StepLogin, StepPrivacy, StepSelectCandidate, StepVitals } = window.MedSteps;
const { StepAntidoping, StepHAMA, StepHAMD } = window.MedSteps2;
const { Step5Ds, StepVeredicto } = window.MedSteps3;
const { useState: aS, useEffect: aE } = React;

const STEPS = ['login','privacy','select','vitals','antidoping','hama','hamd','cincoDs','veredicto'];
const SUBTITLES = {
  login:      'Acceso restringido — solo médicos certificados',
  privacy:    'Aviso de Privacidad de Datos Sensibles',
  select:     'Seleccionar candidato a evaluar',
  vitals:     'Paso 1/5 — Signos vitales y antropometría',
  antidoping: 'Paso 2/5 — Antidoping 5 paneles',
  hama:       'Paso 3/5 — Escala Hamilton de Ansiedad',
  hamd:       'Paso 4/5 — Escala Hamilton de Depresión',
  cincoDs:    'Paso 5/5 — Evaluación funcional 5 D\'s',
  veredicto:  'Veredicto médico final',
};

function App() {
  const [step, setStep] = aS('login');
  const [doctor, setDoctor] = aS(null);
  const [privacyAt, setPrivacyAt] = aS(null);
  const [candidate, setCandidate] = aS(null);
  const [data, setData] = aS({});
  const [inIframe] = aS(window.self !== window.top);

  const go = (s) => setStep(s);

  const reset = () => {
    setStep('select');
    setCandidate(null);
    setData({});
  };

  const handleLogout = () => {
    if (confirm('¿Cerrar sesión médica? Se perderá el progreso no guardado.')) {
      setStep('login');
      setDoctor(null);
      setPrivacyAt(null);
      setCandidate(null);
      setData({});
    }
  };

  // Guardar: actualiza candidato (solo veredicto) + inserta expediente médico privado
  const handleSave = async (fullData) => {
    const candId = candidate?.id;
    if (!candId) throw new Error('Sin ID de candidato');

    // 1) Actualizar SOLO el veredicto en tabla pública
    const publicUpdate = {
      veredicto_medico: fullData.veredicto_medico,
      fase_actual: fullData.veredicto_medico === 'APTO' ? 'espera_entrevista_jefe' : fullData.veredicto_medico === 'CONDICIONADO' ? 'observacion_medica' : 'rechazado_medico',
      ultima_evaluacion_medica: fullData.fecha_evaluacion,
    };

    const { error: upErr } = await supabase
      .from('Formulario de Candidatos')
      .update(publicUpdate)
      .eq('id', candId);

    // No bloqueamos si la tabla no tiene esos columnas — continuamos al expediente
    if (upErr) console.warn('Update veredicto:', upErr.message);

    // 2) Insertar expediente médico privado (datos brutos)
    const expediente = {
      candidato_id: candId,
      candidato_nombre: candidate.nombre,
      evaluado_por: fullData.evaluado_por?.name,
      cedula_profesional: fullData.evaluado_por?.cedula,
      fecha_evaluacion: fullData.fecha_evaluacion,
      privacy_accepted_at: privacyAt,
      veredicto: fullData.veredicto_medico,
      veredicto_motivos: fullData.veredicto_motivos,
      veredicto_override: fullData.veredicto_override,
      signos_vitales: fullData.vitals,
      antidoping: fullData.antidoping,
      hama_respuestas: fullData.hama,
      hamd_respuestas: fullData.hamd,
      cinco_ds: fullData.cincoDs,
      notas_medicas: fullData.notas_medicas,
      scores: fullData.veredicto_scores,
    };

    const { error: insErr } = await supabase
      .from('examenes_medicos')
      .insert([expediente]);

    if (insErr) {
      // Si la tabla no existe, guardamos localmente como fallback
      const local = JSON.parse(localStorage.getItem('mb_examenes_medicos') || '[]');
      local.push(expediente);
      localStorage.setItem('mb_examenes_medicos', JSON.stringify(local));
      return { savedLocally: true, error: 'Tabla examenes_medicos no existe en Supabase aún — guardado en navegador. Crea la tabla o usa el SQL Setup.' };
    }

    return { savedRemote: true };
  };

  const update = (newData) => setData(newData);

  const stepIdx = STEPS.indexOf(step);
  const showProgress = stepIdx >= 3 && stepIdx <= 7;

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F5', padding: '20px 12px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <AH
          subtitle={SUBTITLES[step]}
          doctor={doctor?.name}
          candidate={candidate?.nombre}
          onLogout={doctor ? handleLogout : null}
        />
        {inIframe && step === 'select' && (
          <div style={{ background: '#FFF3CD', border: '2px solid #FFC107', borderTop: 'none', padding: 12, fontSize: 12, color: '#856404' }}>
            ⚠ Esta previsualización bloquea Supabase. <a href="#" onClick={e=>{e.preventDefault(); window.open(location.href, '_blank');}} style={{ color: '#D7282F', fontWeight: 700 }}>Abre en pestaña nueva</a> para cargar candidatos.
          </div>
        )}
        {showProgress && <APB step={stepIdx - 2} total={5} />}
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
          {step === 'login' && <StepLogin onLogin={d => { setDoctor(d); go('privacy'); }} />}
          {step === 'privacy' && <StepPrivacy doctor={doctor} onAccept={(ts)=>{setPrivacyAt(ts); go('select');}} onCancel={()=>go('login')} />}
          {step === 'select' && <StepSelectCandidate onSelect={c=>{setCandidate(c); go('vitals');}} onBack={()=>go('privacy')} />}
          {step === 'vitals' && <StepVitals data={data} onChange={update} onBack={()=>go('select')} onNext={()=>go('antidoping')} />}
          {step === 'antidoping' && <StepAntidoping data={data} onChange={update} onBack={()=>go('vitals')} onNext={()=>go('hama')} />}
          {step === 'hama' && <StepHAMA data={data} onChange={update} onBack={()=>go('antidoping')} onNext={()=>go('hamd')} />}
          {step === 'hamd' && <StepHAMD data={data} onChange={update} onBack={()=>go('hama')} onNext={()=>go('cincoDs')} />}
          {step === 'cincoDs' && <Step5Ds data={data} onChange={update} onBack={()=>go('hamd')} onNext={()=>go('veredicto')} />}
          {step === 'veredicto' && <StepVeredicto data={data} candidate={candidate} doctor={doctor} onBack={()=>go('cincoDs')} onSave={handleSave} onFinish={reset} />}
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#999' }}>
          Skill: mb_medical_evaluation_005 · RLS encrypted · LFPDPPP Art. 9
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
