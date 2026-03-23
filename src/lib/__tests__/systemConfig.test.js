import { describe, it, expect } from 'vitest';
import {
    getConfig,
    getRoles,
    getValidRoleCodes,
    getRoleLevel,
    getExecRoles,
    getVatRate,
    getDefaultVatMode,
    getTiers,
    getVpRate,
    getCertThresholds,
    getCertLevelForHours,
    getOrderTypes,
    getPaymentMethods,
    getSlipConfidenceThreshold,
    getCourseCategories,
    getCourseCategoryCodes,
    getFoodCategories,
    getEquipmentCategories,
    getOriginCountries,
    getSessionTypes,
    getScheduleStatuses,
    getEnrollmentStatuses,
    getSwapLimit,
    getLotStatuses,
    getStockMovementTypes,
    getAbcThresholds,
    getDefaultYieldPercent,
    getPoStatuses,
    getTaskPriorities,
    getTaskStatuses,
    getTaskTypes,
    getGrades,
    getGradeForScore,
    getDepartmentCodes,
    getEmploymentTypes,
    getCustomerChannels,
    getLifecycleStages,
    getCacheTTL,
    getThemeColors,
    getPieChartPalette,
} from '../systemConfig.js';

describe('systemConfig', () => {

    // ═══════════════════════════════════════════════════════════════
    // YAML LOADING
    // ═══════════════════════════════════════════════════════════════

    describe('getConfig()', () => {
        it('loads YAML and returns non-null object', () => {
            const cfg = getConfig();
            expect(cfg).toBeDefined();
            expect(typeof cfg).toBe('object');
        });

        it('has all top-level domains', () => {
            const cfg = getConfig();
            const expected = [
                'rbac', 'employee', 'vat', 'loyalty', 'certificates',
                'orders', 'payment', 'products', 'scheduling', 'enrollment',
                'inventory', 'procurement', 'tasks', 'audit', 'notifications',
                'customer', 'cache', 'rate_limits', 'theme'
            ];
            for (const key of expected) {
                expect(cfg).toHaveProperty(key);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // RBAC
    // ═══════════════════════════════════════════════════════════════

    describe('RBAC', () => {
        it('has 12 roles', () => {
            expect(getRoles()).toHaveLength(12);
        });

        it('getValidRoleCodes returns all 12 codes', () => {
            const codes = getValidRoleCodes();
            expect(codes).toHaveLength(12);
            expect(codes).toContain('DEV');
            expect(codes).toContain('MGR');
            expect(codes).toContain('STF');
            expect(codes).toContain('AGT');
        });

        it('getRoleLevel returns correct levels', () => {
            expect(getRoleLevel('DEV')).toBe(5);
            expect(getRoleLevel('MGR')).toBe(4);
            expect(getRoleLevel('STF')).toBe(0.5);
            expect(getRoleLevel('UNKNOWN')).toBe(0);
        });

        it('DEV has highest level', () => {
            const roles = getRoles();
            const maxLevel = Math.max(...roles.map(r => r.level));
            expect(getRoleLevel('DEV')).toBe(maxLevel);
        });

        it('exec_roles includes DEV, TEC, MGR, ACC, MKT', () => {
            const exec = getExecRoles();
            expect(exec).toContain('DEV');
            expect(exec).toContain('TEC');
            expect(exec).toContain('MGR');
            expect(exec).toContain('ACC');
            expect(exec).toContain('MKT');
            expect(exec).not.toContain('STF');
        });

        it('every role has code, label, level', () => {
            for (const role of getRoles()) {
                expect(role.code).toBeTruthy();
                expect(role.label).toBeTruthy();
                expect(typeof role.level).toBe('number');
                expect(role.level).toBeGreaterThan(0);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // VAT
    // ═══════════════════════════════════════════════════════════════

    describe('VAT', () => {
        it('rate is 0.07 (7%)', () => {
            expect(getVatRate()).toBe(0.07);
        });

        it('default mode is included or excluded', () => {
            expect(['included', 'excluded']).toContain(getDefaultVatMode());
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // LOYALTY
    // ═══════════════════════════════════════════════════════════════

    describe('Loyalty', () => {
        it('has 5 tiers', () => {
            expect(getTiers()).toHaveLength(5);
        });

        it('tiers are sorted by min_spend ascending', () => {
            const tiers = getTiers();
            for (let i = 1; i < tiers.length; i++) {
                expect(tiers[i].min_spend).toBeGreaterThanOrEqual(tiers[i - 1].min_spend);
            }
        });

        it('TIER1 starts at 0 spend', () => {
            expect(getTiers()[0].min_spend).toBe(0);
        });

        it('TIER5 requires 200,000 spend', () => {
            const t5 = getTiers().find(t => t.code === 'TIER5');
            expect(t5.min_spend).toBe(200000);
        });

        it('VP rate is 300 points per 150 THB', () => {
            const vp = getVpRate();
            expect(vp.points_per_unit).toBe(300);
            expect(vp.spend_per_unit).toBe(150);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CERTIFICATES
    // ═══════════════════════════════════════════════════════════════

    describe('Certificates', () => {
        it('has 3 thresholds', () => {
            expect(getCertThresholds()).toHaveLength(3);
        });

        it('thresholds are 30, 111, 201 hours', () => {
            const hours = getCertThresholds().map(t => t.hours);
            expect(hours).toContain(30);
            expect(hours).toContain(111);
            expect(hours).toContain(201);
        });

        it('getCertLevelForHours returns correct level', () => {
            expect(getCertLevelForHours(10)).toBeNull();
            expect(getCertLevelForHours(30).level).toBe(1);
            expect(getCertLevelForHours(50).level).toBe(1);
            expect(getCertLevelForHours(111).level).toBe(2);
            expect(getCertLevelForHours(200).level).toBe(2);
            expect(getCertLevelForHours(201).level).toBe(3);
            expect(getCertLevelForHours(500).level).toBe(3);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ORDERS & PAYMENT
    // ═══════════════════════════════════════════════════════════════

    describe('Orders', () => {
        it('has 5 order types total', () => {
            expect(getOrderTypes()).toHaveLength(5);
        });

        it('food order types are DINE_IN, TAKE_AWAY, DELIVERY', () => {
            const food = getOrderTypes('food').map(t => t.code);
            expect(food).toEqual(['DINE_IN', 'TAKE_AWAY', 'DELIVERY']);
        });

        it('course order types are ONSITE, ONLINE', () => {
            const course = getOrderTypes('course').map(t => t.code);
            expect(course).toEqual(['ONSITE', 'ONLINE']);
        });

        it('every order type has code, label, icon', () => {
            for (const t of getOrderTypes()) {
                expect(t.code).toBeTruthy();
                expect(t.label).toBeTruthy();
                expect(t.icon).toBeTruthy();
            }
        });
    });

    describe('Payment', () => {
        it('has at least 3 payment methods', () => {
            expect(getPaymentMethods().length).toBeGreaterThanOrEqual(3);
        });

        it('slip confidence threshold is between 0 and 1', () => {
            const t = getSlipConfidenceThreshold();
            expect(t).toBeGreaterThan(0);
            expect(t).toBeLessThanOrEqual(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PRODUCTS
    // ═══════════════════════════════════════════════════════════════

    describe('Products', () => {
        it('has 7 course categories', () => {
            expect(getCourseCategories()).toHaveLength(7);
        });

        it('course category codes include japanese_culinary and package', () => {
            const codes = getCourseCategoryCodes();
            expect(codes).toContain('japanese_culinary');
            expect(codes).toContain('package');
        });

        it('has food categories', () => {
            expect(getFoodCategories().length).toBeGreaterThan(0);
        });

        it('has equipment categories', () => {
            expect(getEquipmentCategories().length).toBeGreaterThan(0);
        });

        it('has 12 origin countries', () => {
            expect(getOriginCountries()).toHaveLength(12);
        });

        it('every category has code, label, icon', () => {
            for (const c of [...getCourseCategories(), ...getFoodCategories(), ...getEquipmentCategories()]) {
                expect(c.code).toBeTruthy();
                expect(c.label).toBeTruthy();
                expect(c.icon).toBeTruthy();
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULING
    // ═══════════════════════════════════════════════════════════════

    describe('Scheduling', () => {
        it('has 3 session types', () => {
            const types = getSessionTypes();
            expect(types).toHaveLength(3);
            expect(types.map(t => t.code)).toEqual(['MORNING', 'AFTERNOON', 'EVENING']);
        });

        it('has 4 schedule statuses', () => {
            const s = getScheduleStatuses();
            expect(s).toEqual(['OPEN', 'FULL', 'CANCELLED', 'COMPLETED']);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // ENROLLMENT
    // ═══════════════════════════════════════════════════════════════

    describe('Enrollment', () => {
        it('has ACTIVE, COMPLETED, CANCELLED statuses', () => {
            expect(getEnrollmentStatuses()).toEqual(['ACTIVE', 'COMPLETED', 'CANCELLED']);
        });

        it('swap limit is 1', () => {
            expect(getSwapLimit()).toBe(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // INVENTORY
    // ═══════════════════════════════════════════════════════════════

    describe('Inventory', () => {
        it('has 4 lot statuses', () => {
            expect(getLotStatuses()).toEqual(['ACTIVE', 'CONSUMED', 'EXPIRED', 'RECALLED']);
        });

        it('has 5 stock movement types', () => {
            expect(getStockMovementTypes()).toHaveLength(5);
        });

        it('ABC thresholds: A=80%, B=95%', () => {
            const abc = getAbcThresholds();
            expect(abc.a_threshold_pct).toBe(80);
            expect(abc.b_threshold_pct).toBe(95);
        });

        it('default yield percent is 100', () => {
            expect(getDefaultYieldPercent()).toBe(100);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PROCUREMENT
    // ═══════════════════════════════════════════════════════════════

    describe('Procurement', () => {
        it('PO statuses include DRAFT → CLOSED lifecycle', () => {
            const s = getPoStatuses();
            expect(s[0]).toBe('DRAFT');
            expect(s).toContain('APPROVED');
            expect(s).toContain('ORDERED');
            expect(s).toContain('CLOSED');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // TASKS
    // ═══════════════════════════════════════════════════════════════

    describe('Tasks', () => {
        it('has 6 priority levels (L0-L5)', () => {
            const p = getTaskPriorities();
            expect(p).toHaveLength(6);
            expect(p[0].code).toBe('L0');
            expect(p[5].code).toBe('L5');
        });

        it('has 4 statuses', () => {
            expect(getTaskStatuses()).toEqual(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
        });

        it('has 3 task types (SINGLE, RANGE, PROJECT)', () => {
            const t = getTaskTypes();
            expect(t).toHaveLength(3);
            expect(t.map(x => x.code)).toEqual(['SINGLE', 'RANGE', 'PROJECT']);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE
    // ═══════════════════════════════════════════════════════════════

    describe('Employee', () => {
        it('has 5 grades (S/A/B/C/D)', () => {
            const g = getGrades();
            expect(g).toHaveLength(5);
            expect(g.map(x => x.code)).toEqual(['S', 'A', 'B', 'C', 'D']);
        });

        it('getGradeForScore returns correct grade', () => {
            expect(getGradeForScore(95).code).toBe('S');
            expect(getGradeForScore(90).code).toBe('S');
            expect(getGradeForScore(80).code).toBe('A');
            expect(getGradeForScore(60).code).toBe('B');
            expect(getGradeForScore(40).code).toBe('C');
            expect(getGradeForScore(10).code).toBe('D');
            expect(getGradeForScore(0).code).toBe('D');
        });

        it('has department codes', () => {
            const d = getDepartmentCodes();
            expect(d.marketing).toBe('MKT');
            expect(d.production).toBe('PD');
        });

        it('has employment types', () => {
            const t = getEmploymentTypes();
            expect(t.employee).toBe('EMP');
            expect(t.freelance).toBe('FL');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER
    // ═══════════════════════════════════════════════════════════════

    describe('Customer', () => {
        it('has 4 channels (FB, LN, WB, PH)', () => {
            const ch = getCustomerChannels();
            expect(ch).toHaveLength(4);
            expect(ch.map(c => c.code)).toEqual(['FB', 'LN', 'WB', 'PH']);
        });

        it('lifecycle stages start with Lead', () => {
            expect(getLifecycleStages()[0]).toBe('Lead');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // CACHE & THEME
    // ═══════════════════════════════════════════════════════════════

    describe('Cache', () => {
        it('default TTL is 300 seconds', () => {
            expect(getCacheTTL()).toBe(300);
        });
    });

    describe('Theme', () => {
        it('has gold and navy colors', () => {
            const c = getThemeColors();
            expect(c.gold).toBe('#cc9d37');
            expect(c.navy).toBe('#0c1a2f');
        });

        it('pie chart palette has 10 colors', () => {
            expect(getPieChartPalette()).toHaveLength(10);
        });
    });
});
