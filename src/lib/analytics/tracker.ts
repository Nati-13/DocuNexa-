import crypto from 'crypto';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { AnalyticsEventType, DbAnalyticsEvent } from '@/lib/supabase/types';

// Map of common ISO country codes to human-readable country names
export const COUNTRY_NAMES: Record<string, string> = {
  ET: 'Ethiopia',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  CA: 'Canada',
  AU: 'Australia',
  IN: 'India',
  KE: 'Kenya',
  NG: 'Nigeria',
  ZA: 'South Africa',
  NL: 'Netherlands',
  SE: 'Sweden',
  BR: 'Brazil',
  JP: 'Japan',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  CN: 'China',
  IT: 'Italy',
  ES: 'Spain',
  CH: 'Switzerland',
  PL: 'Poland',
  TR: 'Turkey',
  Unknown: 'Unknown Location',
};

export function getCountryName(code: string | null | undefined): string {
  if (!code || code === 'Unknown' || code === 'XX' || code === 'T1') {
    return 'Unknown Location';
  }
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || upper;
}

export function getCountryFlag(code: string | null | undefined): string {
  if (!code || code === 'Unknown' || code === 'XX' || code.length !== 2) {
    return '🌐';
  }
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// In-memory fallback vault for resilient metric reporting
interface MemoryEvent {
  eventType: AnalyticsEventType;
  path: string;
  countryCode: string | null;
  visitorIdHash: string;
  userId: string | null;
  createdAt: number;
}

const memoryAnalyticsVault: MemoryEvent[] = [];

/**
 * Computes a privacy-preserving daily rotating visitor hash.
 * Raw IP addresses are NEVER stored in memory or in the database.
 */
export function hashVisitorIdentifier(ip: string = '127.0.0.1', dateStr: string = new Date().toISOString().slice(0, 10)): string {
  const salt = process.env.ANALYTICS_SALT || 'docunexa-privacy-salt-2026';
  return crypto
    .createHash('sha256')
    .update(`${ip}-${dateStr}-${salt}`)
    .digest('hex')
    .slice(0, 32);
}

export interface RecordEventParams {
  eventType: AnalyticsEventType;
  path: string;
  countryCode?: string | null;
  ip?: string | null;
  userId?: string | null;
}

/**
 * Records an analytics event (pageview, signup, or login) in a privacy-preserving manner.
 */
export async function recordAnalyticsEvent({
  eventType,
  path,
  countryCode,
  ip = '127.0.0.1',
  userId,
}: RecordEventParams): Promise<void> {
  const now = Date.now();
  const dateStr = new Date(now).toISOString().slice(0, 10);
  const cleanPath = (path || '/').split('?')[0].toLowerCase();
  const visitorHash = hashVisitorIdentifier(ip || '127.0.0.1', dateStr);
  const cleanCountry = countryCode && countryCode.length === 2 ? countryCode.toUpperCase() : null;

  // Save in memory vault
  memoryAnalyticsVault.push({
    eventType,
    path: cleanPath,
    countryCode: cleanCountry,
    visitorIdHash: visitorHash,
    userId: userId || null,
    createdAt: now,
  });

  // Keep in-memory vault bounded (last 5,000 events)
  if (memoryAnalyticsVault.length > 5000) {
    memoryAnalyticsVault.splice(0, memoryAnalyticsVault.length - 5000);
  }

  // Persist to database if available
  try {
    const admin = createAdminSupabaseClient();
    await admin.from('analytics_events').insert({
      event_type: eventType,
      path: cleanPath,
      country_code: cleanCountry,
      visitor_id_hash: visitorHash,
      user_id: userId || null,
      created_at: new Date(now).toISOString(),
    });
  } catch {
    // Database table may not be migrated yet; in-memory fallback continues seamlessly
  }
}

export interface CountryStat {
  countryCode: string;
  countryName: string;
  flag: string;
  pageViews: number;
  uniqueVisitors: number;
  percentage: number;
}

export interface PageStat {
  path: string;
  views: number;
  uniqueVisitors: number;
}

export interface DailyTrend {
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  signups: number;
  logins: number;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  uniqueVisitors: number;
  activeVisitorsLast15m: number;
  successfulLogins: number;
  signups: number;
  countries: CountryStat[];
  popularPages: PageStat[];
  dailyTrends: DailyTrend[];
  dau: number; // Daily active users
  wau: number; // Weekly active users
  mau: number; // Monthly active users
}

/**
 * Computes an aggregated analytics summary over the requested days.
 */
export async function getAnalyticsSummary(rangeDays: number = 30): Promise<AnalyticsSummary> {
  const now = Date.now();
  const startTime = now - rangeDays * 24 * 60 * 60 * 1000;
  const startIso = new Date(startTime).toISOString();

  let events: Array<{
    eventType: AnalyticsEventType;
    path: string;
    countryCode: string | null;
    visitorIdHash: string;
    userId: string | null;
    createdAt: string | number;
  }> = [];

  // Try fetching from database first
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from('analytics_events')
      .select('event_type, path, country_code, visitor_id_hash, user_id, created_at')
      .gte('created_at', startIso)
      .order('created_at', { ascending: false })
      .limit(10000);

    if (!error && data && data.length > 0) {
      events = data.map((d) => ({
        eventType: d.event_type,
        path: d.path,
        countryCode: d.country_code,
        visitorIdHash: d.visitor_id_hash,
        userId: d.user_id,
        createdAt: d.created_at,
      }));
    }
  } catch {
    // DB query failed or table unmigrated; use memory vault
  }

  // Fallback to in-memory vault if DB was empty or unavailable
  if (events.length === 0) {
    events = memoryAnalyticsVault
      .filter((e) => e.createdAt >= startTime)
      .map((e) => ({
        eventType: e.eventType,
        path: e.path,
        countryCode: e.countryCode,
        visitorIdHash: e.visitorIdHash,
        userId: e.userId,
        createdAt: e.createdAt,
      }));
  }

  // Aggregation
  let totalPageViews = 0;
  let successfulLogins = 0;
  let signups = 0;
  const allUniqueVisitors = new Set<string>();
  const activeVisitors15mSet = new Set<string>();

  const fifteenMinutesAgo = now - 15 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();

  const countryPageViews: Record<string, number> = {};
  const countryUniqueVisitors: Record<string, Set<string>> = {};
  const pageViewsMap: Record<string, number> = {};
  const pageVisitorsMap: Record<string, Set<string>> = {};
  const dailyBuckets: Record<string, { views: number; visitors: Set<string>; signups: number; logins: number }> = {};

  for (const ev of events) {
    const evTime = typeof ev.createdAt === 'number' ? ev.createdAt : new Date(ev.createdAt).getTime();
    const dateKey = new Date(evTime).toISOString().slice(0, 10);

    if (!dailyBuckets[dateKey]) {
      dailyBuckets[dateKey] = { views: 0, visitors: new Set(), signups: 0, logins: 0 };
    }

    if (ev.eventType === 'pageview') {
      totalPageViews++;
      allUniqueVisitors.add(ev.visitorIdHash);
      dailyBuckets[dateKey].views++;
      dailyBuckets[dateKey].visitors.add(ev.visitorIdHash);

      if (evTime >= fifteenMinutesAgo) {
        activeVisitors15mSet.add(ev.visitorIdHash);
      }

      // Country stats
      const c = ev.countryCode || 'Unknown';
      countryPageViews[c] = (countryPageViews[c] || 0) + 1;
      if (!countryUniqueVisitors[c]) countryUniqueVisitors[c] = new Set();
      countryUniqueVisitors[c].add(ev.visitorIdHash);

      // Page stats
      pageViewsMap[ev.path] = (pageViewsMap[ev.path] || 0) + 1;
      if (!pageVisitorsMap[ev.path]) pageVisitorsMap[ev.path] = new Set();
      pageVisitorsMap[ev.path].add(ev.visitorIdHash);
    } else if (ev.eventType === 'login') {
      successfulLogins++;
      dailyBuckets[dateKey].logins++;
    } else if (ev.eventType === 'signup') {
      signups++;
      dailyBuckets[dateKey].signups++;
    }

    // Active users tracking (by authenticated user_id)
    if (ev.userId) {
      if (evTime >= oneDayAgo) dauSet.add(ev.userId);
      if (evTime >= sevenDaysAgo) wauSet.add(ev.userId);
      if (evTime >= thirtyDaysAgo) mauSet.add(ev.userId);
    }
  }

  // Country ranking array
  const countryList: CountryStat[] = Object.keys(countryPageViews)
    .map((code) => {
      const views = countryPageViews[code];
      const visitors = countryUniqueVisitors[code]?.size || 0;
      const percentage = totalPageViews > 0 ? Math.round((views / totalPageViews) * 100) : 0;
      return {
        countryCode: code,
        countryName: getCountryName(code),
        flag: getCountryFlag(code),
        pageViews: views,
        uniqueVisitors: visitors,
        percentage,
      };
    })
    .sort((a, b) => b.pageViews - a.pageViews);

  // Popular pages array
  const popularPagesList: PageStat[] = Object.keys(pageViewsMap)
    .map((p) => ({
      path: p,
      views: pageViewsMap[p],
      uniqueVisitors: pageVisitorsMap[p]?.size || 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Daily trends array (sorted chronologically)
  const dailyTrendsList: DailyTrend[] = Object.keys(dailyBuckets)
    .sort()
    .map((d) => ({
      date: d,
      pageViews: dailyBuckets[d].views,
      uniqueVisitors: dailyBuckets[d].visitors.size,
      signups: dailyBuckets[d].signups,
      logins: dailyBuckets[d].logins,
    }));

  return {
    totalPageViews,
    uniqueVisitors: allUniqueVisitors.size,
    activeVisitorsLast15m: activeVisitors15mSet.size,
    successfulLogins,
    signups,
    countries: countryList,
    popularPages: popularPagesList,
    dailyTrends: dailyTrendsList,
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
  };
}
