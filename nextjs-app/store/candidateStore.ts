'use client';
import { create } from 'zustand';

export type CandidateProfile = {
  nombre: string;
  edad: string;
  estatura: string;
  peso: string;
  genero: string;
};

export type DocumentRecord = {
  url: string;
  localOnly?: boolean;
  base64?: string;
  name: string;
};

type CandidateStore = {
  role: string;
  profile: CandidateProfile;
  documents: Record<string, DocumentRecord>;
  healthChecks: Record<string, boolean>;
  psychResponses: Record<string, number>;
  techResponses: Record<string, number>;
  techScore: number;
  verdict: string;
  savedId: number | null;

  setRole: (role: string) => void;
  setProfile: (profile: Partial<CandidateProfile>) => void;
  setDocument: (id: string, doc: DocumentRecord) => void;
  setHealthCheck: (id: string, val: boolean) => void;
  setPsychResponse: (idx: number, val: number) => void;
  setTechResponse: (idx: number, val: number) => void;
  setTechScore: (score: number) => void;
  setVerdict: (verdict: string) => void;
  setSavedId: (id: number) => void;
  reset: () => void;
};

const initialState = {
  role: 'almacen',
  profile: { nombre: '', edad: '', estatura: '', peso: '', genero: '' },
  documents: {},
  healthChecks: {},
  psychResponses: {},
  techResponses: {},
  techScore: 0,
  verdict: '',
  savedId: null,
};

export const useCandidateStore = create<CandidateStore>((set) => ({
  ...initialState,
  setRole: (role) => set({ role }),
  setProfile: (profile) => set((s) => ({ profile: { ...s.profile, ...profile } })),
  setDocument: (id, doc) => set((s) => ({ documents: { ...s.documents, [id]: doc } })),
  setHealthCheck: (id, val) => set((s) => ({ healthChecks: { ...s.healthChecks, [id]: val } })),
  setPsychResponse: (idx, val) => set((s) => ({ psychResponses: { ...s.psychResponses, [idx]: val } })),
  setTechResponse: (idx, val) => set((s) => ({ techResponses: { ...s.techResponses, [idx]: val } })),
  setTechScore: (techScore) => set({ techScore }),
  setVerdict: (verdict) => set({ verdict }),
  setSavedId: (savedId) => set({ savedId }),
  reset: () => set(initialState),
}));
