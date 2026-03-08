/**
 * Hourly Ledger Writer (Phase 5 — ADR-024 D4)
 * Append-only log of hourly Ad metrics for trend graphs.
 * Delta Rule: only inserts a new row when metrics have changed.
 */

import { getPrisma } from '../lib/db.js';

/**
 * Appends a new AdHourlyLedger entry if metrics changed since last write.
 *
 * @param {string} adId       Ad.adId business key (not UUID)
 * @param {Date}   hourDate   The hour being recorded (time portion used for hour int)
 * @param {{ spend: number, impressions: number, clicks: number }} current  Current metric snapshot
 * @returns {Promise<boolean>} true = inserted (delta detected), false = skipped (no change)
 */
async function appendLedgerIfChanged(adId, hourDate, current) {
  const prisma = await getPrisma();

  const dayDate = new Date(hourDate.getFullYear(), hourDate.getMonth(), hourDate.getDate());
  const hour = hourDate.getHours();

  // Check last entry for this (adId, date, hour) slot
  const lastEntry = await prisma.adHourlyLedger.findFirst({
    where: { adId, date: dayDate, hour },
    orderBy: { createdAt: 'desc' },
  });

  const unchanged =
    lastEntry &&
    lastEntry.spend === current.spend &&
    lastEntry.impressions === current.impressions &&
    lastEntry.clicks === current.clicks;

  if (unchanged) return false;

  await prisma.adHourlyLedger.create({
    data: {
      adId,
      date: dayDate,
      hour,
      spend: current.spend,
      impressions: current.impressions,
      clicks: current.clicks,
      leads: 0,
      purchases: 0,
    },
  });

  return true;
}

export { appendLedgerIfChanged };
