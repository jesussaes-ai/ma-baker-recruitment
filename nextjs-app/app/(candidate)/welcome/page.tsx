'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #D7282F 0%, #0071BC 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
      className="animate-fadeIn"
    >
      <div style={{ marginBottom: 32 }}>
        <Image
          src="/images/chef-logo.jpg"
          alt="Ma Baker & Chef"
          width={280}
          height={280}
          style={{ borderRadius: 16, objectFit: 'contain', background: '#fff', padding: 8 }}
          priority
        />
      </div>

      <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>
        Sistema Cloud de Reclutamiento
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 40, fontWeight: 500 }}>
        v4.1 — Ma Baker &amp; Chef
      </p>

      <button
        onClick={() => router.push('/role')}
        style={{
          background: '#fff',
          color: '#D7282F',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 40px',
          fontSize: 16,
          fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      >
        Iniciar Evaluación →
      </button>

      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 40, fontWeight: 500 }}>
        El proceso toma aproximadamente 20-30 minutos
      </p>
    </div>
  );
}
