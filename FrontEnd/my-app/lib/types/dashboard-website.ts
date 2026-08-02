export type WebApiResponse = Record<string, unknown>;

export type DashboardWebsiteResponse = {
  review: WebApiResponse;
  sosmed: WebApiResponse;
  socialMediaEngagement: WebApiResponse;
  visitor: WebApiResponse;
  socialClicks: WebApiResponse;
  visitorSessions: WebApiResponse;
  tiktok: WebApiResponse;
  tiktokHitStats: WebApiResponse;
};
