// ═══════════════════════════════════════════════════════════════════
// MA BAKER — EVALUACIÓN MÉDICA · FASE 3 (BÚNKER MÉDICO)
// Skill: mb_medical_evaluation_005
// Privacidad MÁXIMA · Solo rol médico · Datos sensibles encriptados
// ═══════════════════════════════════════════════════════════════════

const { useState, useEffect, useMemo } = React;
const M = window.MED_DATA;

const SUPABASE_URL = 'https://xdtxfpvxoxqaadgyvzap.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdHhmcHZ4b3hxYWFkZ3l2emFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzk5OTgsImV4cCI6MjA4NzU1NTk5OH0.0bordJwiTVA-7kqOUsrPcchoSmJS2QKAHUirwN0S1QA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ───────── UI helpers ─────────
const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,.06)', maxWidth: 760, margin: '0 auto', ...style }}>{children}</div>
);

const Btn = ({ children, onClick, variant = 'primary', disabled, style }) => {
  const variants = {
    primary: { background: '#D7282F', color: '#fff' },
    secondary: { background: '#fff', color: '#1A1A1A', border: '2px solid #E0E0E0' },
    medical: { background: '#0071BC', color: '#fff' },
    success: { background: '#4CAF50', color: '#fff' },
    danger: { background: '#D32F2F', color: '#fff' },
    warning: { background: '#FF9800', color: '#fff' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 24px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1,
      fontFamily: 'Montserrat,sans-serif', transition: 'all .2s', ...variants[variant], ...style
    }}>{children}</button>
  );
};

const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{label}</label>
    {children}
    {hint && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{hint}</div>}
  </div>
);

const Input = (props) => (
  <input {...props} style={{
    width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #E0E0E0',
    fontFamily: 'inherit', fontSize: 14, ...props.style
  }} />
);

const Banner = ({ type, children }) => {
  const colors = {
    info: { bg: 'rgba(0,113,188,.08)', border: '#0071BC', text: '#0050a0' },
    success: { bg: 'rgba(76,175,80,.08)', border: '#4CAF50', text: '#2e7d32' },
    warning: { bg: 'rgba(255,193,7,.12)', border: '#FFC107', text: '#856404' },
    danger: { bg: 'rgba(211,47,47,.08)', border: '#D32F2F', text: '#c62828' },
  };
  const c = colors[type] || colors.info;
  return <div style={{ background: c.bg, border: `2px solid ${c.border}`, color: c.text, padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>{children}</div>;
};

const Header = ({ subtitle, candidate, doctor, onLogout }) => (
  <div style={{ background: 'linear-gradient(135deg,#0071BC 0%,#005a96 100%)', color: '#fff', padding: '20px 24px', borderRadius: '12px 12px 0 0', marginBottom: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🏥</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Búnker Médico · Ma Baker</h1>
          <span style={{ background: 'rgba(255,255,255,.2)', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>RLS</span>
        </div>
        <p style={{ fontSize: 12, opacity: .9, margin: 0 }}>{subtitle}</p>
      </div>
      {doctor && (
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <div style={{ opacity: .85 }}>Dr(a). {doctor}</div>
          {candidate && <div style={{ fontWeight: 700, marginTop: 2 }}>Eval: {candidate}</div>}
          {onLogout && <button onClick={onLogout} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.4)', padding: '3px 10px', borderRadius: 4, marginTop: 6, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar sesión</button>}
        </div>
      )}
    </div>
  </div>
);

const ProgressBar = ({ step, total }) => (
  <div style={{ background: '#F5F5F5', padding: '12px 24px', borderBottom: '1px solid #E0E0E0' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 6 }}>
      <span>Paso {step} de {total}</span>
      <span>{Math.round((step/total)*100)}%</span>
    </div>
    <div style={{ height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${(step/total)*100}%`, background: '#0071BC', transition: 'width .3s' }} />
    </div>
  </div>
);

window.MedUI = { Card, Btn, Field, Input, Banner, Header, ProgressBar };
