export interface TrendingTopicExplanation {
  trending_score?: number | null;
  base_score?: number | null;
  delta_plens?: number | null;
  score_premsa?: number | null;
  score_xarxes?: number | null;
  penalty_applied?: number | null;
  calculated_at?: string | null;
  principal_signal?: string | null;
  principal_source?: string | null;
  penalty_label?: string | null;
  explanation_text?: string | null;
}

export interface TrendingTopic {
  tema?: string | null;
  nombre?: string | null;
  count?: number | null;
  menciones?: number | null;
  trending_score?: number | null;
  score?: TrendingTopicExplanation | null;
  principal_signal?: string | null;
  principal_source?: string | null;
  penalty_applied?: number | null;
  penalty_label?: string | null;
  explanation_text?: string | null;
}

export type UpcomingMeetingAlertStatus = 'warning' | 'danger';

export interface UpcomingMeetingAlertThresholds {
  warning_hours?: number | null;
  danger_hours?: number | null;
}

export interface UpcomingMeetingAlertItem {
  rule_id?: number | null;
  title?: string | null;
  municipality?: string | null;
  municipality_ids?: number[] | null;
  meeting_at?: string | null;
  last_processed_at?: string | null;
  status?: UpcomingMeetingAlertStatus | null;
  message?: string | null;
}

export interface UpcomingMeetingsBanner {
  status?: UpcomingMeetingAlertStatus | null;
  message?: string | null;
  thresholds?: UpcomingMeetingAlertThresholds | null;
  primary_meeting?: UpcomingMeetingAlertItem | null;
  meetings?: UpcomingMeetingAlertItem[] | null;
  total?: number | null;
}

export interface DashboardOverview {
  upcoming_meetings_banner?: UpcomingMeetingsBanner | null;
}
