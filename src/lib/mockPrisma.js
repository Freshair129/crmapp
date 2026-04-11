/**
 * Mock Prisma Client
 * ใช้แทน real Prisma เมื่อ DB connection ล้มเหลว
 * รองรับ pattern ทั้งหมดที่ใช้ใน repositories
 */
import * as mockData from './mockData.js';

// Map model name → mock data array
const MODEL_DATA = {
  employee: mockData.employees,
  customer: mockData.customers,
  product: mockData.products,
  order: mockData.orders,
  task: mockData.tasks,
  courseSchedule: mockData.courseSchedules,
  enrollment: mockData.enrollments,
  package: mockData.packages,
  packageEnrollment: mockData.packageEnrollments,
  conversation: mockData.conversations,
  adDailyMetric: mockData.adDailyMetrics,
  supplier: mockData.suppliers,
  purchaseOrderV2: mockData.purchaseOrdersV2,
  ingredient: mockData.ingredients,
  ingredientLot: mockData.ingredientLots,
  warehouse: mockData.warehouses,
  warehouseStock: mockData.warehouseStocks,
  stockMovement: mockData.stockMovements,
  stockCount: mockData.stockCounts,
  recipe: mockData.recipes,
  asset: mockData.assets,
  certificate: mockData.certificates,
  campaign: mockData.campaigns,
  marketPrice: mockData.marketPrices,
  aiConfig: mockData.aiConfigs,
  notificationRule: mockData.notificationRules,
  auditLog: mockData.auditLogs,
  advance: mockData.advances,
  purchaseRequest: mockData.purchaseOrdersV2,
  knowledgeFile: mockData.knowledgeFiles,
  pushSubscription: mockData.pushSubscriptions,
  adReviewResult: mockData.adReviewResults,
  adsOptimizeRequest: mockData.adsOptimizeRequests,
  classAttendance: mockData.classAttendances,
  productBarcode: mockData.productBarcodes,
};

// Apply select: only keep specified keys
function applySelect(item, select) {
  if (!select || typeof select !== 'object') return item;
  const result = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true || (typeof val === 'object' && val !== null)) {
      result[key] = item[key] !== undefined ? item[key] : null;
    }
  }
  return result;
}

// Apply basic where filter
function applyWhere(items, where) {
  if (!where || typeof where !== 'object') return items;

  return items.filter(item => {
    return checkWhere(item, where);
  });
}

function checkWhere(item, where) {
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND') {
      const clauses = Array.isArray(condition) ? condition : [condition];
      if (!clauses.every(c => Object.keys(c).length === 0 || checkWhere(item, c))) return false;
      continue;
    }
    if (key === 'OR') {
      const clauses = Array.isArray(condition) ? condition : [condition];
      if (!clauses.some(c => checkWhere(item, c))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (checkWhere(item, condition)) return false;
      continue;
    }

    const itemVal = item[key];

    if (condition === null || condition === undefined) {
      if (itemVal !== null && itemVal !== undefined) return false;
      continue;
    }

    if (typeof condition === 'object' && !Array.isArray(condition)) {
      // Prisma operators
      if ('equals' in condition) {
        if (itemVal !== condition.equals) return false;
      }
      if ('not' in condition) {
        if (itemVal === condition.not) return false;
      }
      if ('in' in condition) {
        if (!condition.in.includes(itemVal)) return false;
      }
      if ('notIn' in condition) {
        if (condition.notIn.includes(itemVal)) return false;
      }
      if ('contains' in condition) {
        const mode = condition.mode === 'insensitive';
        const haystack = mode ? String(itemVal || '').toLowerCase() : String(itemVal || '');
        const needle = mode ? String(condition.contains).toLowerCase() : String(condition.contains);
        if (!haystack.includes(needle)) return false;
      }
      if ('startsWith' in condition) {
        if (!String(itemVal || '').startsWith(condition.startsWith)) return false;
      }
      if ('endsWith' in condition) {
        if (!String(itemVal || '').endsWith(condition.endsWith)) return false;
      }
      if ('gt' in condition) {
        if (!(itemVal > condition.gt)) return false;
      }
      if ('gte' in condition) {
        if (!(itemVal >= condition.gte)) return false;
      }
      if ('lt' in condition) {
        if (!(itemVal < condition.lt)) return false;
      }
      if ('lte' in condition) {
        if (!(itemVal <= condition.lte)) return false;
      }
      if ('hasEvery' in condition) {
        const arr = Array.isArray(itemVal) ? itemVal : [];
        if (!condition.hasEvery.every(v => arr.includes(v))) return false;
      }
      if ('hasSome' in condition) {
        const arr = Array.isArray(itemVal) ? itemVal : [];
        if (!condition.hasSome.some(v => arr.includes(v))) return false;
      }
      continue;
    }

    // Direct equality
    if (itemVal !== condition) return false;
  }
  return true;
}

// Apply include: add empty arrays/null for any relation field not already present
function applyInclude(item, include) {
  if (!include || typeof include !== 'object') return item;
  const result = { ...item };
  for (const key of Object.keys(include)) {
    if (result[key] === undefined) {
      // Default: relation fields are arrays (hasMany) or null (hasOne)
      result[key] = [];
    }
  }
  return result;
}

// Apply orderBy
function applyOrderBy(items, orderBy) {
  if (!orderBy) return items;
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...items].sort((a, b) => {
    for (const ord of orders) {
      for (const [key, dir] of Object.entries(ord)) {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal === bVal) continue;
        if (aVal === null || aVal === undefined) return dir === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return dir === 'asc' ? -1 : 1;
        const cmp = aVal < bVal ? -1 : 1;
        return dir === 'asc' ? cmp : -cmp;
      }
    }
    return 0;
  });
}

function makeModel(name, baseData) {
  const getData = () => (MODEL_DATA[name] || baseData || []);

  return {
    findMany: async ({ where, select, orderBy, take, skip, include, distinct } = {}) => {
      let result = applyWhere(getData(), where);
      result = applyOrderBy(result, orderBy);
      if (skip) result = result.slice(skip);
      if (take) result = result.slice(0, take);
      if (include) result = result.map(item => applyInclude(item, include));
      if (select) result = result.map(item => applySelect(item, select));
      return result;
    },

    findFirst: async ({ where, select, orderBy, include } = {}) => {
      let result = applyWhere(getData(), where);
      result = applyOrderBy(result, orderBy);
      let item = result[0] || null;
      if (!item) return null;
      if (include) item = applyInclude(item, include);
      return select ? applySelect(item, select) : item;
    },

    findUnique: async ({ where, select, include } = {}) => {
      const data = getData();
      let item = null;
      for (const [key, val] of Object.entries(where || {})) {
        // Handle compound unique (e.g., { userId_role: { userId, role } })
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          item = data.find(d => Object.entries(val).every(([k, v]) => d[k] === v)) || null;
        } else {
          item = data.find(d => d[key] === val) || null;
        }
        break;
      }
      if (!item) return null;
      if (include) item = applyInclude(item, include);
      return select ? applySelect(item, select) : item;
    },

    findUniqueOrThrow: async (args) => {
      const result = await makeModel(name, baseData).findUnique(args);
      if (!result) throw new Error(`Mock: ${name} not found`);
      return result;
    },

    count: async ({ where } = {}) => {
      return applyWhere(getData(), where).length;
    },

    aggregate: async ({ where, _sum, _count, _avg, _min, _max } = {}) => {
      const items = applyWhere(getData(), where);
      const result = {};
      if (_count) {
        result._count = typeof _count === 'object'
          ? Object.fromEntries(Object.keys(_count).map(k => [k, items.filter(i => i[k] !== null).length]))
          : items.length;
      }
      if (_sum) {
        result._sum = Object.fromEntries(
          Object.keys(_sum).map(k => [k, items.reduce((s, i) => s + (Number(i[k]) || 0), 0)])
        );
      }
      if (_avg) {
        result._avg = Object.fromEntries(
          Object.keys(_avg).map(k => {
            const vals = items.map(i => Number(i[k])).filter(v => !isNaN(v));
            return [k, vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null];
          })
        );
      }
      if (_min) {
        result._min = Object.fromEntries(
          Object.keys(_min).map(k => {
            const vals = items.map(i => i[k]).filter(v => v !== null && v !== undefined);
            return [k, vals.length ? vals.reduce((a, b) => a < b ? a : b) : null];
          })
        );
      }
      if (_max) {
        result._max = Object.fromEntries(
          Object.keys(_max).map(k => {
            const vals = items.map(i => i[k]).filter(v => v !== null && v !== undefined);
            return [k, vals.length ? vals.reduce((a, b) => a > b ? a : b) : null];
          })
        );
      }
      return result;
    },

    groupBy: async ({ by, where, _sum, _count, orderBy, having } = {}) => {
      const items = applyWhere(getData(), where);
      const byKeys = Array.isArray(by) ? by : [by];

      // Group items
      const groups = new Map();
      for (const item of items) {
        const groupKey = byKeys.map(k => item[k]).join('|||');
        if (!groups.has(groupKey)) {
          const base = {};
          for (const k of byKeys) base[k] = item[k];
          groups.set(groupKey, { _items: [], ...base });
        }
        groups.get(groupKey)._items.push(item);
      }

      return Array.from(groups.values()).map(g => {
        const result = {};
        for (const k of byKeys) result[k] = g[k];
        if (_count) {
          result._count = typeof _count === 'object'
            ? Object.fromEntries(Object.keys(_count).map(k => [k, g._items.filter(i => i[k] !== null).length]))
            : g._items.length;
        }
        if (_sum) {
          result._sum = Object.fromEntries(
            Object.keys(_sum).map(k => [k, g._items.reduce((s, i) => s + (Number(i[k]) || 0), 0)])
          );
        }
        return result;
      });
    },

    create: async ({ data, select }) => {
      const newItem = {
        id: 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      };
      getData().push(newItem);
      return select ? applySelect(newItem, select) : newItem;
    },

    createMany: async ({ data, skipDuplicates }) => {
      const items = Array.isArray(data) ? data : [data];
      items.forEach(d => getData().push({
        id: 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
        ...d
      }));
      return { count: items.length };
    },

    update: async ({ where, data, select }) => {
      const arr = getData();
      const idx = arr.findIndex(item => {
        for (const [k, v] of Object.entries(where || {})) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx === -1) throw new Error(`Mock: ${name} not found for update`);
      arr[idx] = { ...arr[idx], ...data, updatedAt: new Date().toISOString() };
      return select ? applySelect(arr[idx], select) : arr[idx];
    },

    updateMany: async ({ where, data }) => {
      const arr = getData();
      let count = 0;
      arr.forEach((item, idx) => {
        if (checkWhere(item, where || {})) {
          arr[idx] = { ...item, ...data, updatedAt: new Date().toISOString() };
          count++;
        }
      });
      return { count };
    },

    upsert: async ({ where, create, update, select }) => {
      const arr = getData();
      const idx = arr.findIndex(item => {
        for (const [k, v] of Object.entries(where || {})) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx >= 0) {
        arr[idx] = { ...arr[idx], ...update, updatedAt: new Date().toISOString() };
        return select ? applySelect(arr[idx], select) : arr[idx];
      } else {
        const newItem = {
          id: 'mock-' + Date.now(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...create,
        };
        arr.push(newItem);
        return select ? applySelect(newItem, select) : newItem;
      }
    },

    delete: async ({ where }) => {
      const arr = getData();
      const idx = arr.findIndex(item => {
        for (const [k, v] of Object.entries(where || {})) {
          if (item[k] !== v) return false;
        }
        return true;
      });
      if (idx >= 0) {
        const deleted = arr[idx];
        arr.splice(idx, 1);
        return deleted;
      }
      throw new Error(`Mock: ${name} not found for delete`);
    },

    deleteMany: async ({ where }) => {
      const arr = getData();
      const before = arr.length;
      const toKeep = applyWhere(arr, where).map(i => i.id);
      const kept = arr.filter(item => !toKeep.includes(item.id));
      MODEL_DATA[name] = kept;
      return { count: before - kept.length };
    },
  };
}

// Create the mock Prisma client
function createMockPrisma() {
  const models = {};
  for (const name of Object.keys(MODEL_DATA)) {
    models[name] = makeModel(name);
  }

  return {
    ...models,

    // Transaction: run all operations sequentially
    $transaction: async (fnOrArray, options) => {
      if (typeof fnOrArray === 'function') {
        return fnOrArray(client);
      }
      // Array of promises
      return Promise.all(fnOrArray);
    },

    // Raw queries: return empty result
    $queryRaw: async (...args) => [],
    $executeRaw: async (...args) => 0,
    $queryRawUnsafe: async (...args) => [],
    $executeRawUnsafe: async (...args) => 0,

    // Connection management (no-ops)
    $connect: async () => {},
    $disconnect: async () => {},

    // Events
    $on: (event, fn) => {},
    $use: (fn) => {},
    $extends: (ext) => client,
  };
}

const client = createMockPrisma();
export { client as mockPrismaClient };
export default client;
