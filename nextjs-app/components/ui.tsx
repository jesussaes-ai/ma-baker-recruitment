'use client';
import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'white';

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: '#D7282F', color: '#fff', border: 'none' },
  secondary: { background: '#F5F5F5', color: '#1A1A1A', border: '2px solid #D7282F' },
  success:   { background: '#4CAF50', color: '#fff', border: 'none' },
  warning:   { background: '#FFC107', color: '#000', border: 'none' },
  danger:    { background: '#D32F2F', color: '#fff', border: 'none' },
  white:     { background: '#fff', color: '#D7282F', border: 'none' },
};

export function Button({
  children,
  variant = 'primary',
  onClick,
  disabled = false,
  style = {},
  className = '',
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        padding: '12px 24px',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '14px',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

type AlertType = 'success' | 'warning' | 'danger' | 'info';

const alertColors: Record<AlertType, { bg: string; border: string; text: string }> = {
  success: { bg: 'rgba(76,175,80,0.1)',   border: '2px solid #4CAF50', text: '#4CAF50' },
  warning: { bg: 'rgba(255,193,7,0.1)',   border: '2px solid #FFC107', text: '#FFC107' },
  danger:  { bg: 'rgba(211,47,47,0.1)',   border: '2px solid #D32F2F', text: '#D32F2F' },
  info:    { bg: 'rgba(0,113,188,0.1)',   border: '2px solid #0071BC', text: '#0071BC' },
};

export function Alert({
  type = 'info',
  children,
  style = {},
}: {
  type?: AlertType;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const c = alertColors[type];
  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: c.bg,
        border: c.border,
        color: c.text,
        fontWeight: 600,
        fontSize: '13px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  style = {},
  className = '',
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`animate-slideIn ${className}`}
      style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#666' }}>
        <span style={{ fontWeight: 600 }}>PASO {current} DE {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#D7282F', borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ width: 40, height: 4, background: '#D7282F', borderRadius: 2, margin: '0 auto 12px' }} />
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 13, color: '#666' }}>{subtitle}</p>}
    </div>
  );
}

export function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
  step,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, letterSpacing: '0.5px' }}>
        {label} {required && <span style={{ color: '#D7282F' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1.5px solid #E0E0E0',
          borderRadius: '8px',
          fontSize: 14,
          background: '#fff',
        }}
      />
    </div>
  );
}
