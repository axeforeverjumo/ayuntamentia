import { PageHeader } from '@/components/warroom/PageHeader';
import { StatusLine } from '@/components/warroom/StatusBadge';

const shellRowStyle = {
  height: 12,
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(58,125,181,.12) 0%, rgba(58,125,181,.24) 50%, rgba(58,125,181,.12) 100%)',
} as const;

function SkeletonBlock({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        border: '1px solid var(--line)',
        background: 'var(--ink-2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(58,125,181,.10) 50%, transparent 100%)',
          animation: 'shimmer 1.8s linear infinite',
        }}
      />
    </div>
  );
}

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)' }}>
      <PageHeader
        crumb="Operacions / Intel·ligència"
        title={<>Intel·ligència <span style={{ color: 'var(--brand-l)', fontWeight: 400, fontStyle: 'italic' }}>estratègica.</span></>}
        info={{
          title: 'Intel·ligència estratègica',
          description: "Anàlisi profunda del posicionament polític. Detecta qui no va alineat dins de cada partit, quins temes estan escalant i on hi ha més vulnerabilitat.",
          dataSource: 'Anàlisi creuat de votacions, actes i sessions parlamentàries',
          tips: [
            'Estem preparant rànquings, tendències i vulnerabilitats en una sola vista.',
          ],
        }}
        actions={<StatusLine color="var(--wr-phosphor)">Preparant dades en viu…</StatusLine>}
      />

      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
        {['Rànquing intern', 'Tendències', 'Intel·ligència competitiva', 'Promeses incomplertes'].map((label, index) => (
          <div
            key={label}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: index === 0 ? 'var(--ink-3)' : 'transparent',
              borderBottom: index === 0 ? '2px solid var(--brand-l)' : '2px solid transparent',
              borderRight: '1px solid var(--line)',
              color: index === 0 ? 'var(--paper)' : 'var(--fog)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          border: '1px solid var(--line)',
          background: 'var(--ink-2)',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1.2fr .8fr',
          gap: 20,
          alignItems: 'center',
        }}>
          <div>
            <div className="pulse-dot" style={{ width: 12, height: 12, borderRadius: 12, background: 'var(--wr-phosphor)', marginBottom: 16 }} />
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 28, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 8 }}>
              Carregant intel·ligència estratègica…
            </div>
            <p style={{ fontSize: 14, color: 'var(--bone)', maxWidth: 560, margin: '0 0 16px' }}>
              Estem creuant rànquings interns, temes en moviment i promeses per evitar la sensació de pàgina buida mentre arriben les dades.
            </p>
            <div style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
              <div style={shellRowStyle} />
              <div style={{ ...shellRowStyle, width: '88%' }} />
              <div style={{ ...shellRowStyle, width: '74%' }} />
            </div>
          </div>

          <div style={{
            border: '1px solid rgba(58,125,181,.25)',
            background: 'rgba(58,125,181,.05)',
            padding: '18px 20px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--wr-phosphor)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              Progrés de càrrega
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Connectant amb l’API', 'Creuant rànquings i tendències', 'Preparant la vista inicial'].map((step, index) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    className="pulse-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      background: index === 2 ? 'var(--fog)' : 'var(--wr-phosphor)',
                      animationDelay: `${index * 0.2}s`,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: index === 2 ? 'var(--fog)' : 'var(--paper)' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          <SkeletonBlock height={118} />
          <SkeletonBlock height={118} />
          <SkeletonBlock height={118} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <SkeletonBlock height={300} />
          <SkeletonBlock height={300} />
        </div>
      </div>
    </div>
  );
}
