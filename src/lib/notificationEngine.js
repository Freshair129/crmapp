import { logger } from './logger';
import { getPrisma } from './db';
import { Client as QStashClient } from '@upstash/qstash';

/**
 * Notification Engine
 * Logic to evaluate rules based on events and context.
 */
export class NotificationEngine {
    constructor() {
        this.qstash = null;
    }

    getQStashClient() {
        if (!this.qstash && process.env.QSTASH_TOKEN) {
            try {
                this.qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
            } catch (err) {
                logger.error('[NotificationEngine]', 'Failed to create QStash client', err);
            }
        }
        return this.qstash;
    }

    /**
     * Evaluate rules for a specific event type.
     */
    async evaluateRules(eventName, context, prismaOverride = null) {
        try {
            const prisma = prismaOverride || await getPrisma();
            
            // 1. Fetch active rules for this event
            const rules = await prisma.notificationRule.findMany({
                where: {
                    event: eventName,
                    isActive: true
                }
            });
 
            if (rules.length === 0) return;
 
            for (const rule of rules) {
                const match = await this.checkConditions(rule.conditions, context);
                
                if (match) {
                    logger.info('[NotificationEngine]', `Rule MATCH: ${rule.name} (${rule.ruleId})`);
                    
                    // Phase 27: Publish to QStash instead of BullMQ
                    const qstash = this.getQStashClient();
                    if (qstash) {
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                        const workerUrl = `${appUrl}/api/workers/notification`;
 
                        await qstash.publishJSON({
                            url: workerUrl,
                            body: {
                                ruleId: rule.ruleId,
                                actions: rule.actions,
                                context
                            },
                            retries: 5,
                        });
                        logger.info('[NotificationEngine]', `Enqueued to QStash: ${rule.ruleId}`);
                    } else {
                        logger.warn('[NotificationEngine]', 'QStash client not initialized (check QSTASH_TOKEN)');
                    }
                }
            }
        } catch (error) {
            logger.error('[NotificationEngine]', 'Rule evaluation failed', error);
        }
    }

    /**
     * Simple condition checker.
     * Supports basic keyword matching and boolean flags.
     */
    async checkConditions(conditions, context) {
        // If no conditions, it's a catch-all match
        if (!conditions || Object.keys(conditions).length === 0) return true;

        const { message, customer } = context;

        // Condition: Keywords in message content
        if (conditions.keywords && Array.isArray(conditions.keywords) && message?.content) {
            const content = message.content.toLowerCase();
            const hasKeyword = conditions.keywords.some(kw => content.includes(kw.toLowerCase()));
            if (!hasKeyword) return false;
        }

        // Condition: Membership Tier
        if (conditions.membershipTier && customer?.membershipTier) {
            if (customer.membershipTier !== conditions.membershipTier) return false;
        }

        // Condition: VIP flag (if implemented in intelligence or elsewhere)
        if (conditions.vip && customer?.intelligence?.is_vip === false) {
            return false;
        }

        return true;
    }
}

export const notificationEngine = new NotificationEngine();
export default notificationEngine;
