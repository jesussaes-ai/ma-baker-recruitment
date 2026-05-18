export type Question = {
  text: string;
  options: string[];
  correct: number;
};

export const TECHNICAL_QUESTIONS: Record<string, Question[]> = {
  almacen: [
    { text: '¿Cuál es tu responsabilidad principal en recepción?', options: ['A) Guardar rápido', 'B) Verificar coincidencia', 'C) Firmar sin revisar', 'D) Avisar supervisor'], correct: 1 },
    { text: '¿Requisito físico indispensable?', options: ['A) Correr largas distancias', 'B) Esfuerzo físico prolongado', 'C) Operar maquinaria', 'D) Ninguno'], correct: 1 },
    { text: '¿Qué aseguras al distribuir?', options: ['A) Vehículo limpio', 'B) Ruta trazada', 'C) Material correcto', 'D) <10 minutos'], correct: 2 },
    { text: '¿Qué haces si quedan 10 min antes de salir pero hay urgencia?', options: ['A) Me retiro', 'B) Apago equipos', 'C) Extiendo jornada', 'D) Pido ayuda'], correct: 2 },
    { text: '¿Competencia ante alta demanda?', options: ['A) Sentido urgencia', 'B) Tolerancia', 'C) Creatividad', 'D) Liderazgo'], correct: 0 },
    { text: '¿Qué aseguras al empaquetar?', options: ['A) Cajas pequeñas', 'B) Integridad calidad', 'C) Pesar', 'D) Etiquetas color'], correct: 1 },
    { text: '¿Tu rol con inventarios?', options: ['A) Diseñar software', 'B) Apoyar inventarios físicos', 'C) Decidir compras', 'D) Auditar mermas'], correct: 1 },
    { text: '¿Por qué puntualidad?', options: ['A) Bonos', 'B) Desayunar', 'C) Flujo operativo', 'D) Evitar penales'], correct: 2 },
    { text: '¿En qué basarse al organizar?', options: ['A) Espacio vacío', 'B) Llegada camiones', 'C) Procedimientos empresa', 'D) Criterio chofer'], correct: 2 },
    { text: '¿Atención al detalle en?', options: ['A) Revisión conteo materiales', 'B) Limpieza personal', 'C) Químicos', 'D) Reportes financieros'], correct: 0 },
  ],
  mezclador: [
    { text: '¿Tolerancia máxima error pesajes?', options: ['A) 1.5%', 'B) 0.50%', 'C) 0.05%', 'D) 0.01%'], correct: 2 },
    { text: '¿Si mezclas cerca de caducidad?', options: ['A) Desechar inmediatamente', 'B) Colaborar Desarrollo', 'C) Usar rápido', 'D) Cambiar fecha'], correct: 1 },
    { text: '¿Cometes error pesaje?', options: ['A) Ocultarlo <1%', 'B) Reportar colaborar', 'C) Desechar sin avisar', 'D) Dejar a un lado'], correct: 1 },
    { text: '¿Herramientas a manejar?', options: ['A) Montacargas patines', 'B) Básculas analíticas', 'C) Medidores volumen', 'D) Básculas tonelaje'], correct: 1 },
    { text: '¿Calidad pide ajuste?', options: ['A) Implementar documentar', 'B) Discutir inspector', 'C) Ignorar', 'D) Enviar nota'], correct: 0 },
    { text: '¿Orientación químicos aromáticos?', options: ['A) Jefe Almacén', 'B) Proveedor', 'C) Desarrollo', 'D) Gerente Ventas'], correct: 2 },
    { text: '¿Error pesaje causa?', options: ['A) Retraso 5 minutos', 'B) Afecta producción reputación', 'C) Nada grave', 'D) Cambio turno'], correct: 1 },
    { text: '¿Mezcla física garantizar?', options: ['A) Enfriamiento <0°C', 'B) Empaquetado final', 'C) Homogeneización dispersión', 'D) Cambio color'], correct: 2 },
    { text: '¿Quién determina vida anaquel?', options: ['A) Mezclador', 'B) Auxiliar', 'C) Desarrollo', 'D) Jefe almacén'], correct: 2 },
    { text: '¿A quién reportas?', options: ['A) Supervisor almacén', 'B) Jefe almacén materia prima', 'C) Gerente general', 'D) Director calidad'], correct: 1 },
  ],
};

export const PSYCH_QUESTIONS: Question[] = [
  { text: '1. Cuando tengo un problema en el trabajo, prefiero:', options: ['A. Actuar rápido sin pensar', 'B. Analizar la situación antes de actuar', 'C. Pedir ayuda a un compañero', 'D. Evitarlo y esperar que se resuelva solo'], correct: 1 },
  { text: '2. ¿Cuál es tu mayor fortaleza personal?', options: ['A. Liderazgo y toma de decisiones', 'B. Atención al detalle y precisión', 'C. Creatividad e innovación', 'D. Confiabilidad y puntualidad'], correct: 3 },
  { text: '3. Prefieres trabajar:', options: ['A. En equipo, colaborando', 'B. Solo, a mi propio ritmo', 'C. Mixto, según la tarea', 'D. No tengo preferencia'], correct: 2 },
  { text: '4. Ante un cambio repentino en mi rutina laboral:', options: ['A. Me adapto fácilmente', 'B. Me cuesta y cuestiono el cambio', 'C. Me preocupa y genera estrés', 'D. Me entusiasma y motiva'], correct: 0 },
  { text: '5. ¿Cómo manejas el estrés bajo presión?', options: ['A. Muy bien, mantengo la calma', 'B. Mal, me bloqueo', 'C. Regular, depende del día', 'D. Depende del tipo de presión'], correct: 0 },
  { text: '6. Si un compañero comete un error que afecta tu trabajo:', options: ['A. Le grito y reclamo de inmediato', 'B. Hablo con él para entender qué pasó', 'C. Lo reporto a mi jefe sin avisarle', 'D. Lo ignoro y arreglo solo'], correct: 1 },
  { text: '7. Para mí la puntualidad es:', options: ['A. Muy importante, llego siempre antes', 'B. Importante, pero a veces se me complica', 'C. Relativa, lo importante es cumplir', 'D. No le doy mucha importancia'], correct: 0 },
  { text: '8. Cuando recibo instrucciones de mi jefe:', options: ['A. Las cuestiono si no estoy de acuerdo', 'B. Las sigo aunque no esté de acuerdo', 'C. Pregunto si tengo dudas y luego las ejecuto', 'D. Hago las cosas a mi manera'], correct: 2 },
  { text: '9. Si encuentro $500 olvidados en mi área de trabajo:', options: ['A. Los guardo para mí, nadie me vio', 'B. Los entrego a mi jefe inmediatamente', 'C. Pregunto a mis compañeros de quién son', 'D. Los dejo donde están'], correct: 1 },
  { text: '10. Mi capacidad para seguir procedimientos repetitivos es:', options: ['A. Excelente, me concentro fácilmente', 'B. Buena, pero me aburro a veces', 'C. Regular, prefiero variedad', 'D. Mala, me distraigo'], correct: 0 },
  { text: '11. Si tengo problemas personales que afectan mi desempeño:', options: ['A. Los oculto y trato de cumplir', 'B. Hablo con mi jefe para buscar solución', 'C. Falto al trabajo hasta resolverlo', 'D. Me desahogo con compañeros'], correct: 1 },
  { text: '12. ¿Qué es más importante para ti en un empleo?', options: ['A. El sueldo', 'B. El ambiente laboral y respeto', 'C. La estabilidad y crecimiento', 'D. La cercanía con mi casa'], correct: 2 },
];

export const DOCUMENTS = [
  { id: 'ine', name: 'Identificación Oficial (INE)', required: true },
  { id: 'domicilio', name: 'Comprobante de Domicilio', required: true },
  { id: 'estudios', name: 'Certificado de Estudios', required: true },
  { id: 'medico', name: 'Certificado Médico', required: true },
  { id: 'cv', name: 'Currículum Vitae', required: true },
];

export const ROLE_DATA = {
  almacen: {
    label: '📦 Auxiliar de Almacén',
    ageMin: 25,
    ageMax: 40,
    phyReq: 'Alto esfuerzo físico (Carga/Descarga)',
    healthChecks: ['Confirmo que no tengo lesiones lumbares', 'Aptitud para esfuerzo físico prolongado'],
    description: 'Edad 25-40 · Esfuerzo físico alto',
  },
  mezclador: {
    label: '🧪 Mezclador de Formulaciones',
    ageMin: 22,
    ageMax: 50,
    phyReq: 'Levantar 25kg ocasionalmente',
    healthChecks: ['Confirmo que no tengo lesiones lumbares', 'Aptitud para precisión', 'Capacidad para levantar 25kg ocasionalmente'],
    description: 'Edad 22-50 · Precisión + 25kg ocasional',
  },
};

export function calcTechScore(responses: Record<string, number>, role: string): number {
  const questions = TECHNICAL_QUESTIONS[role] ?? [];
  const correct = Object.values(responses).filter((ans, idx) => ans === questions[idx]?.correct).length;
  return Math.round((correct / questions.length) * 100);
}

export function getVerdict(score: number): { label: string; color: string; emoji: string } {
  if (score >= 70) return { label: 'Apto para Entrevista', color: '#4CAF50', emoji: '🎉' };
  if (score >= 50) return { label: 'Evaluación Adicional', color: '#FFC107', emoji: '📋' };
  return { label: 'No cumple perfil', color: '#D32F2F', emoji: '✅' };
}
