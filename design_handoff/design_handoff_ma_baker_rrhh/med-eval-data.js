// ═══════════════════════════════════════════════════════════════════
// DATOS CLÍNICOS — ESCALAS HAMILTON, ANTIDOPING, 5 D's
// Skill: mb_medical_evaluation_005 (Fase 3 - Búnker Médico)
// ═══════════════════════════════════════════════════════════════════

window.MED_DATA = {

  // Antidoping — 5 paneles estándar SAMHSA
  ANTIDOPING_PANELS: [
    { id: 'thc', name: 'Marihuana (THC)', cutoff: '50 ng/mL' },
    { id: 'coc', name: 'Cocaína (COC)', cutoff: '300 ng/mL' },
    { id: 'opi', name: 'Opiáceos (OPI)', cutoff: '2000 ng/mL' },
    { id: 'amp', name: 'Anfetaminas (AMP)', cutoff: '1000 ng/mL' },
    { id: 'bzo', name: 'Benzodiacepinas (BZO)', cutoff: '300 ng/mL' },
  ],

  // Hamilton HAM-A — 14 ítems, cada uno 0-4
  // 0 = Ausente · 1 = Leve · 2 = Moderado · 3 = Grave · 4 = Muy grave
  HAMA_ITEMS: [
    { id: 1, label: 'Humor ansioso', desc: 'Preocupaciones, anticipación de lo peor, aprensión, irritabilidad' },
    { id: 2, label: 'Tensión', desc: 'Sensación de tensión, fatigabilidad, sobresalto, llanto fácil, temblores' },
    { id: 3, label: 'Miedos', desc: 'A la oscuridad, desconocidos, animales, tráfico, multitudes' },
    { id: 4, label: 'Insomnio', desc: 'Dificultad para conciliar el sueño, despertares, pesadillas' },
    { id: 5, label: 'Función intelectual', desc: 'Dificultad para concentrarse, mala memoria' },
    { id: 6, label: 'Humor deprimido', desc: 'Pérdida de interés, anhedonia, cambios de humor, sentimientos de tristeza' },
    { id: 7, label: 'Síntomas somáticos musculares', desc: 'Dolores musculares, rigidez, sacudidas, bruxismo' },
    { id: 8, label: 'Síntomas somáticos sensoriales', desc: 'Tinnitus, visión borrosa, oleadas de calor/frío, debilidad' },
    { id: 9, label: 'Síntomas cardiovasculares', desc: 'Taquicardia, palpitaciones, dolor torácico, sensación de desmayo' },
    { id: 10, label: 'Síntomas respiratorios', desc: 'Opresión torácica, sensación de ahogo, disnea, suspiros' },
    { id: 11, label: 'Síntomas gastrointestinales', desc: 'Disfagia, dispepsia, dolor abdominal, náuseas' },
    { id: 12, label: 'Síntomas genitourinarios', desc: 'Polaquiuria, urgencia miccional, amenorrea, eyaculación precoz' },
    { id: 13, label: 'Síntomas autonómicos', desc: 'Boca seca, rubor, palidez, sudoración, mareos, cefalea' },
    { id: 14, label: 'Comportamiento en entrevista', desc: 'Inquietud, temblor de manos, ceño fruncido, deglución, suspiros' },
  ],

  HAMA_OPTIONS: [
    { v: 0, label: 'Ausente' },
    { v: 1, label: 'Leve' },
    { v: 2, label: 'Moderado' },
    { v: 3, label: 'Grave' },
    { v: 4, label: 'Muy grave' },
  ],

  // HAM-A interpretación
  hamaInterpretation(score) {
    if (score < 17) return { level: 'Leve o ausente', color: '#4CAF50', flag: false };
    if (score <= 24) return { level: 'Ansiedad moderada', color: '#FFC107', flag: true };
    if (score <= 30) return { level: 'Ansiedad grave', color: '#FF9800', flag: true };
    return { level: 'Ansiedad muy grave', color: '#D32F2F', flag: true };
  },

  // Hamilton HAM-D — 17 ítems (versión clásica)
  HAMD_ITEMS: [
    { id: 1, label: 'Humor deprimido', max: 4 },
    { id: 2, label: 'Sentimientos de culpa', max: 4 },
    { id: 3, label: 'Suicidio', max: 4, alert: true },
    { id: 4, label: 'Insomnio precoz (al acostarse)', max: 2 },
    { id: 5, label: 'Insomnio intermedio (madrugada)', max: 2 },
    { id: 6, label: 'Insomnio tardío (despertar temprano)', max: 2 },
    { id: 7, label: 'Trabajo y actividades', max: 4 },
    { id: 8, label: 'Inhibición psicomotora', max: 4 },
    { id: 9, label: 'Agitación', max: 4 },
    { id: 10, label: 'Ansiedad psíquica', max: 4 },
    { id: 11, label: 'Ansiedad somática', max: 4 },
    { id: 12, label: 'Síntomas gastrointestinales', max: 2 },
    { id: 13, label: 'Síntomas somáticos generales', max: 2 },
    { id: 14, label: 'Síntomas genitales', max: 2 },
    { id: 15, label: 'Hipocondría', max: 4 },
    { id: 16, label: 'Pérdida de peso', max: 2 },
    { id: 17, label: 'Introspección (insight)', max: 2 },
  ],

  hamdInterpretation(score) {
    if (score <= 7)  return { level: 'Sin depresión', color: '#4CAF50', flag: false };
    if (score <= 13) return { level: 'Depresión leve', color: '#8BC34A', flag: false };
    if (score <= 18) return { level: 'Depresión moderada', color: '#FFC107', flag: true };
    if (score <= 22) return { level: 'Depresión grave', color: '#FF9800', flag: true };
    return { level: 'Depresión muy grave', color: '#D32F2F', flag: true };
  },

  // Evaluación Funcional 5 D's (clínica)
  // Dolor, Discapacidad, Disconfort, Drogas (medicación), Defunción (mortalidad/riesgo)
  CINCO_DS: [
    {
      id: 'dolor',
      label: 'Dolor (Pain)',
      desc: 'Intensidad del dolor en últimas 2 semanas',
      scale: ['Sin dolor', 'Leve', 'Moderado', 'Intenso', 'Insoportable'],
    },
    {
      id: 'discapacidad',
      label: 'Discapacidad (Disability)',
      desc: 'Limitación para actividades laborales',
      scale: ['Sin limitación', 'Leve', 'Moderada', 'Grave', 'Total'],
    },
    {
      id: 'disconfort',
      label: 'Disconfort (Discomfort)',
      desc: 'Malestar psicológico o emocional',
      scale: ['Ninguno', 'Leve', 'Moderado', 'Marcado', 'Severo'],
    },
    {
      id: 'drogas',
      label: 'Drogas / Medicación',
      desc: 'Uso de medicamentos controlados o sustancias',
      scale: ['Ninguna', 'Esporádica', 'Regular bajo Rx', 'Múltiple', 'Polifarmacia / Sospecha abuso'],
    },
    {
      id: 'defuncion',
      label: 'Riesgo Vital (Death Risk)',
      desc: 'Indicadores de riesgo mórbido / suicida',
      scale: ['Sin riesgo', 'Bajo', 'Moderado', 'Alto', 'Inminente'],
    },
  ],

  // Rangos normales signos vitales (adultos)
  VITALS_RANGES: {
    fc:   { min: 60,  max: 100, unit: 'lpm',    label: 'Frecuencia Cardiaca' },
    fr:   { min: 12,  max: 20,  unit: 'rpm',    label: 'Frecuencia Respiratoria' },
    tas:  { min: 90,  max: 130, unit: 'mmHg',   label: 'Tensión Sistólica' },
    tad:  { min: 60,  max: 85,  unit: 'mmHg',   label: 'Tensión Diastólica' },
    temp: { min: 36.1, max: 37.5, unit: '°C',   label: 'Temperatura' },
    spo2: { min: 95,  max: 100, unit: '%',      label: 'Saturación O₂' },
  },

  // IMC clasificación OMS
  imcClass(imc) {
    if (imc < 18.5) return { class: 'Bajo peso', color: '#0288D1' };
    if (imc < 25)   return { class: 'Normal', color: '#4CAF50' };
    if (imc < 30)   return { class: 'Sobrepeso', color: '#FFC107' };
    if (imc < 35)   return { class: 'Obesidad I', color: '#FF9800' };
    if (imc < 40)   return { class: 'Obesidad II', color: '#FF5722' };
    return { class: 'Obesidad III', color: '#D32F2F' };
  },
};
