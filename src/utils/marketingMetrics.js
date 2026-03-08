/**
 * Derived Marketing Metrics (Phase 5 — ADR-024 D5)
 * Pure functions — computed on-the-fly, never stored in DB.
 *
 * Formulas:
 *   CON  = Conversion Efficiency = transactions / costPerResult
 *   CPA  = Cost Per Acquisition  = spend / transactions
 *   ROAS = Return On Ad Spend    = revenue / spend
 */

/**
 * Conversion Efficiency — how many transactions per cost-per-result unit.
 * @param {number} transactions  Total completed purchases/conversions
 * @param {number} costPerResult CPR from Meta (spend / results)
 * @returns {number} CON value, or 0 if costPerResult is 0
 */
function calcCON(transactions, costPerResult) {
  if (!costPerResult) return 0;
  return transactions / costPerResult;
}

/**
 * Cost Per Acquisition — average spend to acquire one transaction.
 * @param {number} spend        Total ad spend (THB)
 * @param {number} transactions Total completed transactions
 * @returns {number} CPA value, or 0 if transactions is 0
 */
function calcCPA(spend, transactions) {
  if (!transactions) return 0;
  return spend / transactions;
}

/**
 * Return On Ad Spend — revenue generated per THB spent.
 * @param {number} revenue Total attributed revenue (THB)
 * @param {number} spend   Total ad spend (THB)
 * @returns {number} ROAS multiplier (e.g. 5.29 = 5.29x), or 0 if spend is 0
 */
function calcROAS(revenue, spend) {
  if (!spend) return 0;
  return revenue / spend;
}

export { calcCON, calcCPA, calcROAS };
