import { logger } from './logger';
import { getPrisma } from './db';
import { notificationQueue } from './queue';

/**
 * Notification Engine
 * Logic to evaluate rules based on events and context.
 */
class NotificationEngine {
    /**
     * Evaluate rules for a specific event type.
     * @param {string} eventName - MESSAGE_RECEIVED | CONVERSATION_CLOSED | etc.
     * @param {Object} context - Data related to the event (message, customer, etc.)
     * @param {Object} [prismaOverride] - Optional prisma client for testing
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

            logger.info('[NotificationEngine]', `Evaluating ${rules.length} rules for event: ${eventName}`);

            for (const rule of rules) {
                const match = await this.checkConditions(rule.conditions, context);
                
                if (match) {
                    logger.info('[NotificationEngine]', `Rule MATCH: ${rule.name} (${rule.ruleId})`);
                    
                    // 2. Enqueue actions
                    await notificationQueue.add(rule.ruleId, {
                        ruleId: rule.ruleId,
                        actions: rule.actions,
                        context
                    });
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
