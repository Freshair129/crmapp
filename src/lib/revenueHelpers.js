/**
 * revenueHelpers.js
 * Shared revenue calculation utilities — used by Analytics.js and tests.
 * SSOT for customer-level revenue resolution.
 */

/**
 * Get the canonical revenue for a customer.
 * Priority: real order data (_orderRevenue) > intelligence.metrics.total_spend > 0
 *
 * @param {Object} customer
 * @returns {number}
 */
export const getRevenue = (c) =>
    c?._orderRevenue || c?.intelligence?.metrics?.total_spend || 0;

/**
 * Compute totalRevenue across a customer array.
 * @param {Array} customers
 * @returns {number}
 */
export const sumRevenue = (customers) =>
    (customers || []).reduce((sum, c) => sum + getRevenue(c), 0);

/**
 * Safe percentage: avoids NaN/Infinity when denominator is 0.
 * Returns null when denominator is 0 (caller should show "—").
 *
 * @param {number} value
 * @param {number} total
 * @param {number} [decimals=1]
 * @returns {string|null}
 */
export const safePct = (value, total, decimals = 1) =>
    total > 0 ? ((value / total) * 100).toFixed(decimals) + '%' : null;

/**
 * Distribute order amount across items evenly.
 * Guards against items.length === 0.
 *
 * @param {number} amount
 * @param {Array} items
 * @returns {number}
 */
export const perItemRevenue = (amount, items) =>
    Array.isArray(items) && items.length > 0 ? amount / items.length : amount;

/**
 * Compute average risk score across customers.
 * Returns '0' when customers is empty to avoid NaN.
 *
 * @param {Array} customers
 * @returns {string}
 */
export const avgChurnRisk = (customers) => {
    const list = customers || [];
    if (list.length === 0) return '0';
    const total = list.reduce((sum, c) => {
        const level = c?.intelligence?.metrics?.churn_risk_level;
        return sum + (level === 'High' ? 100 : level === 'Medium' ? 50 : 0);
    }, 0);
    return (total / list.length).toFixed(0);
};
