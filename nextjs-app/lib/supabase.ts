import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Candidato = {
  id?: number;
  nombre: string;
  edad: number;
  estatura: number;
  peso: number;
  genero: string;
  puesto_aplicado: string;
  documentos: Record<string, string>;
  requisitos_salud: string[];
  respuestas_psicometricas: Record<string, number>;
  respuestas_tecnicas: Record<string, number>;
  puntaje_evaluacion_tecnica: number;
  veredicto_final: string;
  timestamp: string;
  created_at?: string;
  evaluacion_medica?: Record<string, string> | null;
  estado_medico?: string | null;
  fecha_evaluacion_medica?: string | null;
  correo?: string | null;
};
