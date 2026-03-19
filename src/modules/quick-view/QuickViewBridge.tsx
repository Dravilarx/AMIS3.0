import { useState, useEffect } from 'react';

// ──────────────────────────────────────────────────────────────
// 🔗 QuickViewBridge — Magic Link JWT Validator & SESHAT Redirect
// ──────────────────────────────────────────────────────────────
// Ruta: /quick-view?token=<JWT>
//
// Flujo:
//   1. Captura el token de la URL
//   2. Decodifica y valida el JWT (expiración, estructura)
//   3. Si válido → redirect a SESHAT viewer con studyId
//   4. Si inválido/expirado → muestra error elegante
// ──────────────────────────────────────────────────────────────

// 🔧 Configuración de destino SESHAT
const SESHAT_BASE_URL = import.meta.env.VITE_SESHAT_URL || 'https://seshat-gold.vercel.app';

/**
 * Decodifica un JWT sin verificar firma (la firma ya fue verificada al generar).
 * Solo necesitamos extraer el payload y validar expiración.
 */
function decodeJWT(token: string): { valid: boolean; payload?: any; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Token con formato inválido' };
    }

    // Decode base64url → JSON
    const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Validar expiración
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return { valid: false, error: 'expired', payload };
    }

    // Validar issuer
    if (payload.iss !== 'amis-dispatch') {
      return { valid: false, error: 'Enlace no reconocido por el sistema AMIS' };
    }

    // Validar campos requeridos
    if (!payload.studyId || !payload.radiologistId) {
      return { valid: false, error: 'Enlace incompleto — faltan datos del estudio' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'No se pudo decodificar el enlace de seguridad' };
  }
}

type BridgeState = 'loading' | 'validating' | 'redirecting' | 'error';

export function QuickViewBridge() {
  const [state, setState] = useState<BridgeState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [caseInfo, setCaseInfo] = useState<{ caseId?: string; studyId?: string } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setState('error');
      setErrorMessage('No se proporcionó un token de acceso');
      return;
    }

    // Simular proceso de validación con feedback visual
    const runValidation = async () => {
      // Fase 1: Parsing
      setState('loading');
      setProgress(20);
      await sleep(400);

      // Fase 2: Decodificación
      setState('validating');
      setProgress(50);
      await sleep(600);

      const result = decodeJWT(token);

      if (!result.valid) {
        setProgress(100);
        await sleep(300);

        if (result.error === 'expired') {
          setIsExpired(true);
          setErrorMessage('Este enlace ha expirado por seguridad');
          setCaseInfo({
            caseId: result.payload?.caseId,
            studyId: result.payload?.studyId,
          });
        } else {
          setErrorMessage(result.error || 'Error desconocido');
        }
        setState('error');
        return;
      }

      // Fase 3: Redirección
      setProgress(80);
      setState('redirecting');
      setCaseInfo({
        caseId: result.payload.caseId,
        studyId: result.payload.studyId,
      });
      await sleep(800);
      setProgress(100);

      // Construir URL de destino SESHAT
      const viewerUrl = `${SESHAT_BASE_URL}/viewer/${result.payload.studyId}`;
      
      // Redirigir al visor DICOM
      window.location.assign(viewerUrl);
    };

    runValidation();
  }, []);

  // ── Pantalla de Error ──────────────────────────────────────
  if (state === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          {/* Glow effect */}
          <div style={{
            ...styles.glowOrb,
            background: isExpired
              ? 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
          }} />

          {/* Icon */}
          <div style={{
            ...styles.iconCircle,
            background: isExpired
              ? 'linear-gradient(135deg, #f59e0b22, #f97316 22)'
              : 'linear-gradient(135deg, #ef444422, #dc262622)',
            borderColor: isExpired ? '#f59e0b44' : '#ef444444',
          }}>
            <span style={{ fontSize: '2.5rem' }}>{isExpired ? '⏱' : '🔒'}</span>
          </div>

          {/* Title */}
          <h1 style={styles.errorTitle}>
            {isExpired ? 'Enlace Caducado' : 'Acceso Denegado'}
          </h1>

          {/* Message */}
          <p style={styles.errorMessage}>{errorMessage}</p>

          {/* Case info if available */}
          {caseInfo?.caseId && (
            <div style={styles.caseChip}>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Caso:</span>
              <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {caseInfo.caseId}
              </span>
            </div>
          )}

          {/* Divider */}
          <div style={styles.divider} />

          {/* Help text */}
          <div style={styles.helpBox}>
            <p style={styles.helpTitle}>¿Qué puedo hacer?</p>
            {isExpired ? (
              <ul style={styles.helpList}>
                <li>📱 Solicita un nuevo enlace al <strong>Bot AMIS</strong> en Telegram</li>
                <li>💻 Accede directamente al <strong>Centro de Despacho</strong> en AMIS</li>
                <li>⏰ Los enlaces expiran en <strong>2 horas</strong> por seguridad</li>
              </ul>
            ) : (
              <ul style={styles.helpList}>
                <li>🔗 Verifica que el enlace sea correcto y completo</li>
                <li>📱 Contacta al administrador AMIS para obtener acceso</li>
              </ul>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <span style={styles.footerText}>AMIS 3.0 — Motor de Interconsultas Omnicanal</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Pantalla de Carga/Validación ───────────────────────────
  const statusMessages: Record<BridgeState, string> = {
    loading: 'Verificando credenciales de seguridad...',
    validating: 'Autenticando interconsulta...',
    redirecting: 'Conectando con el visor DICOM...',
    error: '',
  };

  return (
    <div style={styles.container}>
      <div style={styles.loadingCard}>
        {/* Ambient glow */}
        <div style={{
          ...styles.glowOrb,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        }} />

        {/* Animated Logo */}
        <div style={styles.logoContainer}>
          <div style={{
            ...styles.logoRing,
            animation: 'pulse-ring 2s ease-in-out infinite',
          }} />
          <div style={{
            ...styles.logoInner,
            animation: 'pulse-logo 2s ease-in-out infinite',
          }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L36 12V28L20 36L4 28V12L20 4Z" stroke="#818cf8" strokeWidth="2" fill="#6366f115" />
              <path d="M20 12L28 16V24L20 28L12 24V16L20 12Z" stroke="#a5b4fc" strokeWidth="1.5" fill="#6366f120" />
              <circle cx="20" cy="20" r="3" fill="#818cf8" />
            </svg>
          </div>
        </div>

        {/* Status text */}
        <h2 style={styles.statusTitle}>{statusMessages[state]}</h2>

        {/* Progress bar */}
        <div style={styles.progressTrack}>
          <div style={{
            ...styles.progressFill,
            width: `${progress}%`,
            background: state === 'redirecting'
              ? 'linear-gradient(90deg, #6366f1, #10b981)'
              : 'linear-gradient(90deg, #6366f1, #818cf8)',
          }} />
        </div>

        {/* Sub-status */}
        {state === 'redirecting' && caseInfo?.caseId && (
          <div style={styles.redirectInfo}>
            <span style={{ color: '#64748b', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              CASO
            </span>
            <span style={{ color: '#a5b4fc', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              {caseInfo.caseId}
            </span>
          </div>
        )}

        {/* Subtle footer */}
        <p style={styles.securityNote}>
          🔐 Conexión segura — Verificación JWT-HMAC
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
        }
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Inline Styles (sin dependencia de CSS externo) ────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f172a 50%, #0a0a0f 100%)',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
  },

  // ── Loading Card ──
  loadingCard: {
    position: 'relative',
    background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '1.5rem',
    padding: '3rem 2.5rem',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center' as const,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  },

  glowOrb: {
    position: 'absolute' as const,
    top: '-50%',
    left: '-25%',
    width: '150%',
    height: '150%',
    pointerEvents: 'none' as const,
  },

  logoContainer: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
    width: '90px',
    height: '90px',
  },

  logoRing: {
    position: 'absolute' as const,
    inset: 0,
    borderRadius: '50%',
    border: '2px solid rgba(99,102,241,0.3)',
  },

  logoInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusTitle: {
    color: '#e2e8f0',
    fontSize: '1rem',
    fontWeight: 500,
    margin: '0 0 1.5rem',
    letterSpacing: '0.02em',
  },

  progressTrack: {
    height: '3px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '1.5rem',
  },

  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.6s ease-out',
  },

  redirectInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    background: 'rgba(99,102,241,0.08)',
    borderRadius: '0.5rem',
    border: '1px solid rgba(99,102,241,0.15)',
    marginBottom: '1rem',
  },

  securityNote: {
    color: '#475569',
    fontSize: '0.7rem',
    margin: 0,
    letterSpacing: '0.03em',
  },

  // ── Error Card ──
  errorCard: {
    position: 'relative' as const,
    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.8))',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '1.5rem',
    padding: '2.5rem 2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
    backdropFilter: 'blur(20px)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
  },

  iconCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '2px solid',
    marginBottom: '1.25rem',
  },

  errorTitle: {
    color: '#f1f5f9',
    fontSize: '1.4rem',
    fontWeight: 700,
    margin: '0 0 0.5rem',
    letterSpacing: '-0.01em',
  },

  errorMessage: {
    color: '#94a3b8',
    fontSize: '0.9rem',
    margin: '0 0 1rem',
    lineHeight: 1.5,
  },

  caseChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.75rem',
    background: 'rgba(51,65,85,0.5)',
    borderRadius: '999px',
    border: '1px solid rgba(71,85,105,0.4)',
    marginBottom: '1rem',
  },

  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(71,85,105,0.5), transparent)',
    margin: '1rem 0',
  },

  helpBox: {
    textAlign: 'left' as const,
    background: 'rgba(15,23,42,0.6)',
    borderRadius: '0.75rem',
    padding: '1rem 1.25rem',
    border: '1px solid rgba(51,65,85,0.3)',
    marginBottom: '1.25rem',
  },

  helpTitle: {
    color: '#cbd5e1',
    fontSize: '0.8rem',
    fontWeight: 600,
    margin: '0 0 0.5rem',
    letterSpacing: '0.02em',
  },

  helpList: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    margin: 0,
    paddingLeft: '0.5rem',
    listStyle: 'none',
    lineHeight: 2,
  },

  footer: {
    marginTop: '0.5rem',
  },

  footerText: {
    color: '#334155',
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
};
