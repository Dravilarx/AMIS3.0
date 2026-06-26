import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Logo AMIS.
//  - type:     'full' (símbolo + wordmark, default) | 'mark' (solo símbolo)
//  - height:   alto en px del símbolo (default 32)
//  - tagline:  texto opcional bajo el wordmark (se renderiza solo en type='full')
//  - variant:  'tema'   → sigue la paleta activa (--logo-accent/-deep/-neutral) [default]
//              'blanco' → knockout blanco, para fondos medios/oscuros (caso mauve)
//              'oscuro' → knockout oscuro, para fondos claros
//              'mono'   → un solo color (monoColor)
//  - monoColor: color para variant='mono' (default currentColor)
// Mantené los fill/stroke en var(--logo-*) en el modo 'tema' para conservar el
// recoloreo por tema. Reemplazá el contenido del <svg> por tu marca real.
// ─────────────────────────────────────────────────────────────────────────────

export type LogoVariant = 'tema' | 'blanco' | 'oscuro' | 'mono';

interface LogoProps {
    type?: 'full' | 'mark';
    height?: number;
    tagline?: string;
    variant?: LogoVariant;
    monoColor?: string;
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({
    type = 'full',
    height = 32,
    tagline,
    variant = 'tema',
    monoColor,
    className,
}) => {
    // Colores según variante
    const themed = variant === 'tema';
    const flat =
        variant === 'blanco' ? '#ffffff' :
        variant === 'oscuro' ? '#0a0f0d' :
        variant === 'mono'   ? (monoColor || 'currentColor') :
        undefined;

    const cAccent  = themed ? 'var(--logo-accent)'  : flat!;
    const cDeep    = themed ? 'var(--logo-deep)'    : 'none';   // sin badge relleno en knockout/mono
    const cNeutral = themed ? 'var(--logo-neutral)' : flat!;
    const cWord    = themed ? 'var(--logo-accent)'  : flat!;

    const mark = (
        <svg
            height={height}
            width={height}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="AMIS"
        >
            {/* Badge: relleno en 'tema', contorno en knockout/mono */}
            <rect
                x={themed ? 2 : 3} y={themed ? 2 : 3}
                width={themed ? 44 : 42} height={themed ? 44 : 42}
                rx="12"
                fill={cDeep}
                stroke={themed ? 'none' : cAccent}
                strokeWidth={themed ? 0 : 2.4}
            />
            {/* Pulso clínico */}
            <path
                d="M8 26 H16 L20 15 L27 33 L31 26 H40"
                stroke={cAccent}
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <circle cx="40" cy="26" r="2.7" fill={cNeutral} />
        </svg>
    );

    if (type === 'mark') {
        return <span className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>{mark}</span>;
    }

    return (
        <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.3 }}>
            {mark}
            <span style={{ display: 'inline-flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
                <span style={{ fontWeight: 900, letterSpacing: '-0.02em', fontSize: height * 0.62, color: cWord, lineHeight: 1 }}>
                    AMIS
                </span>
                {tagline && (
                    <span
                        style={{
                            marginTop: height * 0.1,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.18em',
                            fontSize: height * 0.2,
                            color: themed ? 'var(--logo-neutral)' : cWord,
                            opacity: themed ? 1 : 0.7,
                        }}
                    >
                        {tagline}
                    </span>
                )}
            </span>
        </span>
    );
};

export default Logo;
