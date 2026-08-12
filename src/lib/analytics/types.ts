export interface AnalyticsOverview {
  visitors: number;
  pageViews: number;
  postViews: number;
  clicks: number;
  newVisitors: number;
  returningVisitors: number;
  engagementRate: number;
  viewsPerVisitor: number;
}

export interface ContentStat {
  postId: string;
  title: string;
  platform: string;
  views: number;
  clicks: number;
  engagementRate: number;
}

export interface TrafficSource {
  source: string;
  count: number;
  percentage: number;
}

export interface UtmCampaign {
  campaign: string;
  source: string;
  medium: string;
  count: number;
}

export interface AudienceRow {
  label: string;
  count: number;
  percentage: number;
}

export interface LinkStat {
  linkId: string;
  label: string;
  clicks: number;
}

export interface PlatformComparison {
  platform: string;
  posts: number;
  views: number;
  clicks: number;
  avgViewsPerPost: number;
  clickThroughRate: number;
}

export interface DailyStat {
  day: string;
  pageViews: number;
  postViews: number;
  clicks: number;
}

export interface TimeRange {
  sinceIso: string;
  label: string;
}
