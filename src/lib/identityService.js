/**
 * Identity Service (Phase 6 — ADR-025)
 * Cross-platform customer resolution: Facebook PSID ↔ LINE ID ↔ Phone (E.164).
 * Single source of truth for customer creation/merge across all channels.
 */

import { getPrisma } from './db.js';
import { normalizePhone } from '../utils/phoneUtils.js';
import { logger } from './logger.js';

/**
 * Resolves an existing customer or creates a new one.
 * Merges missing identity fields (PSID / lineId / phone) onto existing records.
 * All DB operations run inside a single prisma.$transaction.
 *
 * @param {{ psid?: string, lineId?: string, phone?: string, channel: 'FB'|'LINE'|'WB'|'WL', name?: string }} payload
 * @returns {Promise<{ customer: object, isNew: boolean, merged: boolean }>}
 */
async function resolveOrCreateCustomer(payload) {
  const { psid, lineId, phone, channel, name } = payload;
  const prisma = await getPrisma();

  return await prisma.$transaction(async (tx) => {
    const normalizedPhone = phone ? normalizePhone(phone) : null;

    // Build lookup conditions for any known identity token
    const conditions = [];
    if (psid)           conditions.push({ facebookId: psid });
    if (lineId)         conditions.push({ lineId });
    if (normalizedPhone) conditions.push({ phonePrimary: normalizedPhone });

    let existing = null;
    if (conditions.length > 0) {
      existing = await tx.customer.findFirst({ where: { OR: conditions } });
    }

    if (existing) {
      // Enrich any identity fields that were missing
      const updateData = {};
      if (psid           && !existing.facebookId)   updateData.facebookId   = psid;
      if (lineId         && !existing.lineId)        updateData.lineId        = lineId;
      if (normalizedPhone && !existing.phonePrimary) updateData.phonePrimary = normalizedPhone;

      const merged = Object.keys(updateData).length > 0;
      const customer = merged
        ? await tx.customer.update({ where: { id: existing.id }, data: updateData })
        : existing;

      logger.info('identity', 'Customer resolved', { customerId: customer.id, merged });
      return { customer, isNew: false, merged };
    }

    // New customer — generate TVS-CUS-{CHANNEL}-{YY}-{SERIAL}
    const year     = String(new Date().getFullYear()).slice(-2);
    const serial   = String(Math.floor(Math.random() * 90000 + 10000));
    const customerId = `TVS-CUS-${channel}-${year}-${serial}`;

    const customer = await tx.customer.create({
      data: {
        customerId,
        facebookId:   psid           ?? null,
        lineId:       lineId         ?? null,
        phonePrimary: normalizedPhone ?? null,
        facebookName: name           ?? null,
      },
    });

    logger.info('identity', 'Customer created', { customerId: customer.id, channel });
    return { customer, isNew: true, merged: false };
  });
}

export { resolveOrCreateCustomer };
