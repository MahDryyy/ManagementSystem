import { apiGet } from "@/lib/api/http";
import type { WebApiResponse } from "@/lib/types/dashboard-website";

export function fetchWebReview() {
  return apiGet<WebApiResponse>("/api/web/review");
}

export function fetchWebSosmedStat() {
  return apiGet<WebApiResponse>("/api/web/sosmed");
}

export function fetchWebSosmedEngagement() {
  return apiGet<WebApiResponse>("/api/web/sosmed/engagement");
}

export function fetchWebVisitor() {
  return apiGet<WebApiResponse>("/api/web/visitor");
}

export function fetchWebSocialClicks() {
  return apiGet<WebApiResponse>("/api/web/social-clicks");
}

export function fetchWebVisitorSessions() {
  return apiGet<WebApiResponse>("/api/web/visitor-sessions");
}

export function fetchWebTiktokStat() {
  return apiGet<WebApiResponse>("/api/web/tiktok");
}

export function fetchWebTiktokHitStats() {
  return apiGet<WebApiResponse>("/api/web/tiktok/hit-stats");
}
