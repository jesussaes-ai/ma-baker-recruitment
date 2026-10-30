'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCandidateStore } from '@/store/candidateStore';
import { DOCUMENTS } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import { PageShell, Card, Header, Button, ProgressBar, Alert } from '@/components/ui';

export default function DocumentsPage() {
  const router = useRouter();
  const { profile, documents, setDocument } = useCandidateStore();
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const allUploaded = DOCUMENTS.every((d) => documents[d.id]);

  async function handleFileChange(docId: string, docName: string, file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera los 10MB permitidos.');
      return;
    }
    setError(null);
    setUploading(docId);

    const ext = file.name.split('.').pop();
    const safeName = profile.nombre.replace(/\s+/g, '_').toUpperCase() || 'CANDIDATO';
    const path = `candidatos/${safeName}_${docId}_${Date.now()}.${ext}`;

    try {
      const { error: upError } = await supabase.storage.from('documentos').upload(path, file, { upsert: true });
      if (upError) throw upError;
      const { data } = supabase.storage.from('documentos').getPublicUrl(path);
      setDocument(docId, { url: data.publicUrl, name: docName });
    } catch {
      // fallback: store as base64 local
      const reader = new FileReader();
      reader.onload = (e) => {
        setDocument(docId, { url: e.target?.result as string, localOnly: true, name: docName });
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(null);
    }
  }

  return (
    <PageShell>
      <ProgressBar current={3} total={7} />
      <Card>
        <Header title="Carga de Documentos" subtitle="Sube los documentos requeridos (JPG, PNG, PDF · máx 10MB)" />

        {error && <Alert type="danger" style={{ marginBottom: 16 }}>{error}</Alert>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {DOCUMENTS.map((doc) => {
            const uploaded = documents[doc.id];
            const isLoading = uploading === doc.id;
            return (
              <div
                key={doc.id}
                style={{
                  border: uploaded ? '2px solid #4CAF50' : '2px dashed #E0E0E0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: uploaded ? 'rgba(76,175,80,0.05)' : '#fff',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: 22 }}>{uploaded ? '✅' : '📄'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>{doc.name}</div>
                  {uploaded && !uploaded.localOnly && (
                    <button
                      onClick={() => setPreview({ url: uploaded.url, name: doc.name })}
                      style={{ background: 'none', border: 'none', color: '#0071BC', fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      Ver documento
                    </button>
                  )}
                  {uploaded?.localOnly && (
                    <span style={{ fontSize: 11, color: '#FFC107', fontWeight: 600 }}>Guardado localmente</span>
                  )}
                </div>
                <input
                  ref={(el) => { inputRefs.current[doc.id] = el; }}
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileChange(doc.id, doc.name, file);
                  }}
                />
                <button
                  onClick={() => inputRefs.current[doc.id]?.click()}
                  disabled={isLoading}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: uploaded ? '#E8F5E9' : '#D7282F',
                    color: uploaded ? '#4CAF50' : '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: 72,
                  }}
                >
                  {isLoading ? '...' : uploaded ? 'Cambiar' : 'Subir'}
                </button>
              </div>
            );
          })}
        </div>

        <Button
          variant="primary"
          onClick={() => router.push('/psych')}
          disabled={!allUploaded}
          style={{ width: '100%' }}
        >
          Continuar →
        </Button>
        <button
          onClick={() => router.push('/profile')}
          style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: 'none', color: '#666', fontSize: 13, cursor: 'pointer' }}
        >
          ← Volver
        </button>
      </Card>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{preview.name}</span>
              <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666' }}>✕</button>
            </div>
            {preview.url.startsWith('data:image') || preview.url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} style={{ width: '100%', borderRadius: 8 }} />
            ) : (
              <a href={preview.url} target="_blank" rel="noreferrer" style={{ color: '#0071BC', fontWeight: 600 }}>Abrir documento →</a>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
