import type {
  DashboardOverview,
  UpcomingMeetingAlertItem,
  UpcomingMeetingsBanner,
  UpcomingMeetingAlertStatus,
} from '@/types/dashboard';

function normalizeStatus(value: unknown): UpcomingMeetingAlertStatus | null {
  return value === 'warning' || value === 'danger' ? value : null;
}

function normalizeMeetingItem(item: unknown): UpcomingMeetingAlertItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const municipalityIds = Array.isArray(candidate.municipality_ids)
    ? candidate.municipality_ids.filter((value): value is number => typeof value === 'number')
    : null;

  return {
    rule_id: typeof candidate.rule_id === 'number' ? candidate.rule_id : null,
    title: typeof candidate.title === 'string' ? candidate.title : null,
    municipality: typeof candidate.municipality === 'string' ? candidate.municipality : null,
    municipality_ids: municipalityIds,
    meeting_at: typeof candidate.meeting_at === 'string' ? candidate.meeting_at : null,
    last_processed_at: typeof candidate.last_processed_at === 'string' ? candidate.last_processed_at : null,
    status: normalizeStatus(candidate.status),
    message: typeof candidate.message === 'string' ? candidate.message : null,
  };
}

function normalizeUpcomingMeetingsBanner(value: unknown): UpcomingMeetingsBanner | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const meetings = Array.isArray(candidate.meetings)
    ? candidate.meetings
      .map(normalizeMeetingItem)
      .filter((item): item is UpcomingMeetingAlertItem => item !== null)
    : [];

  const primaryMeeting = normalizeMeetingItem(candidate.primary_meeting);
  const resolvedStatus = normalizeStatus(candidate.status) ?? primaryMeeting?.status ?? meetings[0]?.status ?? null;

  return {
    status: resolvedStatus,
    message: typeof candidate.message === 'string' ? candidate.message : primaryMeeting?.message ?? meetings[0]?.message ?? null,
    thresholds: candidate.thresholds && typeof candidate.thresholds === 'object'
      ? {
        warning_hours: typeof (candidate.thresholds as Record<string, unknown>).warning_hours === 'number'
          ? (candidate.thresholds as Record<string, unknown>).warning_hours as number
          : null,
        danger_hours: typeof (candidate.thresholds as Record<string, unknown>).danger_hours === 'number'
          ? (candidate.thresholds as Record<string, unknown>).danger_hours as number
          : null,
      }
      : null,
    primary_meeting: primaryMeeting,
    meetings,
    total: typeof candidate.total === 'number' ? candidate.total : meetings.length,
  };
}

export function normalizeDashboardOverview(payload: unknown): DashboardOverview {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const candidate = payload as Record<string, unknown>;

  return {
    upcoming_meetings_banner: normalizeUpcomingMeetingsBanner(candidate.upcoming_meetings_banner),
  };
}
