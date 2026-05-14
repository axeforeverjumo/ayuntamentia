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
