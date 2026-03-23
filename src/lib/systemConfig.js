/**
 * System Config Loader — reads system_config.yaml as master config
 *
 * USAGE:
 *   import { getConfig, getRoles, getTiers, getCertThresholds, ... } from '@/lib/systemConfig';
 *
 *   const cfg = getConfig();
 *   cfg.vat.rate              // 0.07
 *   cfg.loyalty.tiers[2]      // { code: 'TIER3', min_spend: 50000, ... }
 *
 *   // Or use convenience helpers:
 *   getRoles()                // [{ code: 'DEV', label: 'Developer', level: 5 }, ...]
 *   getTiers()                // [{ code: 'TIER1', min_spend: 0, ... }, ...]
 *   getVatRate()              // 0.07
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

let _cached = null;

function loadConfig() {
    if (_cached) return _cached;
    const filePath = path.join(process.cwd(), 'system_config.yaml');
    const raw = fs.readFileSync(filePath, 'utf-8');
    _cached = yaml.load(raw);
    return _cached;
}

// ─── Main getter ────────────────────────────────────────────────────────────
export function getConfig() {
    return loadConfig();
}

// ─── Convenience helpers ────────────────────────────────────────────────────

// RBAC
export function getRoles() { return loadConfig().rbac.roles; }
export function getValidRoleCodes() { return loadConfig().rbac.roles.map(r => r.code); }
export function getRoleLevel(code) { return loadConfig().rbac.roles.find(r => r.code === code)?.level ?? 0; }
export function getExecRoles() { return loadConfig().rbac.exec_roles; }

// VAT
export function getVatRate() { return loadConfig().vat.rate; }
export function getDefaultVatMode() { return loadConfig().vat.default_mode; }

// Loyalty
export function getTiers() { return loadConfig().loyalty.tiers; }
export function getVpRate() { return loadConfig().loyalty.vp_rate; }

// Certificates
export function getCertThresholds() { return loadConfig().certificates.thresholds; }
export function getCertLevelForHours(hours) {
    const thresholds = getCertThresholds().sort((a, b) => b.hours - a.hours);
    for (const t of thresholds) {
        if (hours >= t.hours) return t;
    }
    return null;
}

// Orders
export function getOrderTypes(appliesTo) {
    const types = loadConfig().orders.types;
    if (!appliesTo) return types;
    return types.filter(t => t.applies_to === appliesTo);
}
export function getPaymentMethods() { return loadConfig().payment.methods; }
export function getSlipConfidenceThreshold() { return loadConfig().payment.slip_confidence_threshold; }

// Products
export function getCourseCategories() { return loadConfig().products.course_categories; }
export function getCourseCategoryCodes() { return loadConfig().products.course_categories.map(c => c.code); }
export function getFoodCategories() { return loadConfig().products.food_categories; }
export function getEquipmentCategories() { return loadConfig().products.equipment_categories; }
export function getOriginCountries() { return loadConfig().products.origin_countries; }

// Scheduling
export function getSessionTypes() { return loadConfig().scheduling.session_types; }
export function getScheduleStatuses() { return loadConfig().scheduling.statuses; }

// Enrollment
export function getEnrollmentStatuses() { return loadConfig().enrollment.statuses; }
export function getSwapLimit() { return loadConfig().enrollment.package_enrollment.swap_limit; }

// Inventory
export function getLotStatuses() { return loadConfig().inventory.lot_statuses; }
export function getStockMovementTypes() { return loadConfig().inventory.stock_movement_types; }
export function getAbcThresholds() { return loadConfig().inventory.abc_analysis; }
export function getDefaultYieldPercent() { return loadConfig().inventory.ingredient.default_yield_percent; }

// Procurement
export function getPoStatuses() { return loadConfig().procurement.po_statuses; }

// Tasks
export function getTaskPriorities() { return loadConfig().tasks.priorities; }
export function getTaskStatuses() { return loadConfig().tasks.statuses; }
export function getTaskTypes() { return loadConfig().tasks.types; }

// Employee
export function getGrades() { return loadConfig().employee.grades; }
export function getGradeForScore(score) {
    const grades = getGrades().sort((a, b) => b.min_score - a.min_score);
    for (const g of grades) {
        if (score >= g.min_score) return g;
    }
    return grades[grades.length - 1];
}
export function getDepartmentCodes() { return loadConfig().employee.department_codes; }
export function getEmploymentTypes() { return loadConfig().employee.employment_types; }

// Customer
export function getCustomerChannels() { return loadConfig().customer.channels; }
export function getLifecycleStages() { return loadConfig().customer.lifecycle_stages; }

// Cache
export function getCacheTTL() { return loadConfig().cache.default_ttl; }

// Theme
export function getThemeColors() { return loadConfig().theme.colors; }
export function getPieChartPalette() { return loadConfig().theme.pie_chart_palette; }
