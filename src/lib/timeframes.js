/**
 * getRangeFilter — simple Prisma DateTimeFilter for marketing queries
 * Used by marketingRepo.getCampaignsWithAggregatedMetrics()
 * Returns a Prisma { gte, lte? } object, or undefined for all-time.
 */
export function getRangeFilter(range) {
    const now = new Date();
    if (range === 'today') return { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) };
    if (range === 'last_7d') return { gte: new Date(Date.now() - 7 * 86400000) };
    if (range === 'last_30d') return { gte: new Date(Date.now() - 30 * 86400000) };
    if (range === 'this_month') return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    if (range === 'last_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { gte: start, lte: end };
    }
    return undefined;
}

export const TIMEFRAME_LABELS = {
  today: 'Today',
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_90d: 'Last 90d',
  ytd: 'YTD',
  all_time: 'All Time'
};

export function getDateRange(timeframe) {
  const now = new Date();

  const startOfTodayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));

  const startOfYesterdayUTC = new Date(startOfTodayUTC.getTime());
  startOfYesterdayUTC.setUTCDate(startOfYesterdayUTC.getUTCDate() - 1);

  const firstDayCurrentMonthUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1
  ));

  const firstDayLastMonthUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - 1,
    1
  ));

  const firstDayTwoMonthsAgoUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() - 2,
    1
  ));

  const jan1CurrentYearUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    0,
    1
  ));

  const jan1LastYearUTC = new Date(Date.UTC(
    now.getUTCFullYear() - 1,
    0,
    1
  ));

  // Rolling offsets
  const getRollingDaysAgo = (days) => {
    const d = new Date(now.getTime());
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  };

  switch (timeframe) {
    case 'today':
      return {
        current: { gte: startOfTodayUTC },
        prev: { gte: startOfYesterdayUTC, lt: startOfTodayUTC }
      };

    case 'this_week':
      return {
        current: { gte: getRollingDaysAgo(7) },
        prev: { gte: getRollingDaysAgo(14), lt: getRollingDaysAgo(7) }
      };

    case 'this_month':
      return {
        current: { gte: firstDayCurrentMonthUTC },
        prev: { gte: firstDayLastMonthUTC, lt: firstDayCurrentMonthUTC }
      };

    case 'last_month':
      return {
        current: { gte: firstDayLastMonthUTC, lt: firstDayCurrentMonthUTC },
        prev: { gte: firstDayTwoMonthsAgoUTC, lt: firstDayLastMonthUTC }
      };

    case 'last_90d':
      return {
        current: { gte: getRollingDaysAgo(90) },
        prev: { gte: getRollingDaysAgo(180), lt: getRollingDaysAgo(90) }
      };

    case 'ytd':
      return {
        current: { gte: jan1CurrentYearUTC },
        prev: { gte: jan1LastYearUTC, lt: jan1CurrentYearUTC }
      };

    case 'all_time':
    default:
      return { current: null, prev: null };
  }
}
