'use client';

import Link from 'next/link';

import { PanelBox } from '@/components/warroom/PanelBox';
import { buildRoute } from '@/lib/routes';
import type { DashboardOverview, UpcomingMeetingAlertItem } from '@/types/dashboard';

interface DashboardActivityItem {
  id: string | number;
  municipio: string;
  tipo?: string | null;
  num_puntos?: number | null;
  fecha: string;
}

interface LastProcessedPlensWidgetProps {
  activity: DashboardActivityItem[];
  overview?: DashboardOverview | null;
}

const ALERT_STYLES = {
  warning: {
    border: '1px solid rgba(245, 192, 106, 0.35)',
    background: 'rgba(245, 192, 106, 0.12)',
    badgeBg: '#2D1A00',
    badgeColor: '#F5C06A',
    titleColor: '#F5C06A',
  },
  danger: {
    border: '1px solid rgba(248, 164, 164, 0.35)',
    background: 'rgba(248, 164, 164, 0.10)',
    badgeBg: '#3B0A0A',
    badgeColor: '#F8A4A4',
    titleColor: '#F8A4A4',
  },
} as const;

function formatMeetingDate(value?: string | null): string {
  if (!value) {
    return 'Data pendent';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderMeetingAlertItem(meeting: UpcomingMeetingAlertItem, index: number) {
  const status = meeting.status === 'danger' ? 'danger' : 'warning';
  const styles = ALERT_STYLES[status];

  return (
    <div
      key={`${meeting.rule_id ?? 'meeting'}-${meeting.meeting_at ?? index}-${index}`}
      style={{
        border: styles.border,
        background: styles.background,
        borderRadius: 'var(--r-md)',
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 7px',
              borderRadius: 999,
              background: styles.badgeBg,
              color: styles.badgeColor,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: styles.badgeColor, display: 'inline-block', flexShrink: 0 }} />
              {status === 'danger' ? 'Urgent' : 'Avís'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.06em' }}>
              {meeting.municipality || 'Municipi pendent'}
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: styles.titleColor, marginBottom: 4 }}>
            {meeting.title || 'Reunió propera'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', marginBottom: 6, letterSpacing: '.04em' }}>
            {formatMeetingDate(meeting.meeting_at)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--paper)', lineHeight: 1.55 }}>
            {meeting.message || 'Hi ha una reunió propera pendent de seguiment.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function isRenderableMeetingAlert(meeting: UpcomingMeetingAlertItem | null | undefined): meeting is UpcomingMeetingAlertItem & {
  status: 'warning' | 'danger';
  title: string;
  municipality: string;
  meeting_at: string;
  message: string;
} {
  return Boolean(
    meeting
    && (meeting.status === 'warning' || meeting.status === 'danger')
    && typeof meeting.title === 'string'
    && typeof meeting.municipality === 'string'
    && typeof meeting.meeting_at === 'string'
    && typeof meeting.message === 'string',
  );
}

export function LastProcessedPlensWidget({ activity, overview }: LastProcessedPlensWidgetProps) {
  const banner = overview?.upcoming_meetings_banner ?? null;
  const meetings = banner?.meetings?.filter(isRenderableMeetingAlert) ?? [];
  const hasAlerts = meetings.length > 0;

  return (
    <PanelBox title="Últims plens processats" subtitle={`${activity.length} recents`} tone="phos">
      {hasAlerts ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: activity.length > 0 ? 14 : 0 }}>
          {/* Decisió conservadora MVP: mostrem la llista compacta rebuda del backend en l'ordre servit (ja prioritzat), per no reimplementar severitats ni perdre context quan hi ha més d'una reunió propera. */}
          {meetings.map((meeting, index) => renderMeetingAlertItem(meeting, index))}
        </div>
      ) : null}

      {activity.length > 0 ? (
        <div>
          {activity.slice(0, 6).map((acta, i: number) => (
            <Link key={i} href={buildRoute('actes', acta.id)} style={{
              display: 'grid', gridTemplateColumns: '1fr auto',
              gap: 10, padding: '10px 0',
              borderBottom: i < 5 ? '1px dashed var(--line-soft)' : 'none',
              textDecoration: 'none', color: 'inherit',
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--paper)', fontWeight: 500 }}>{acta.municipio}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', marginTop: 2 }}>
                  {acta.tipo || 'Ordinària'} · {acta.num_puntos || 0} punts
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', textAlign: 'right' }}>
                {acta.fecha}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 500, color: 'var(--paper)', marginBottom: 8 }}>
            Properament
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fog)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Els plens processats apareixeran aquí
          </div>
        </div>
      )}
    </PanelBox>
  );
}
