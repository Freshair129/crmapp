/**
 * ID Generator Utilities
 * Generates human-readable IDs following id_standards.yaml conventions
 */

import { getPrisma } from '@/lib/prisma'

/**
 * Generate audit log ID: LOG-YYYYMMDD-SERIAL
 * @returns {string} LOG-YYYYMMDD-NNN
 */
export async function generateLogId() {
  const prisma = getPrisma()
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  // Count logs created today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const count = await prisma.auditLog.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  })
  
  const serial = String(count + 1).padStart(3, '0')
  return `LOG-${dateStr}-${serial}`
}

/**
 * Generate request ID: OPT-YYYYMMDD-SERIAL
 * For lifetime budget and other ads optimize requests
 * @returns {string} OPT-YYYYMMDD-NNN
 */
export async function generateRequestId() {
  const prisma = getPrisma()
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  // Count requests created today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const count = await prisma.adsOptimizeRequest.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  })
  
  const serial = String(count + 1).padStart(3, '0')
  return `OPT-${dateStr}-${serial}`
}

/**
 * Generate notification rule ID: NOT-YYYYMMDD-SERIAL
 * @returns {string} NOT-YYYYMMDD-NNN
 */
export async function generateNotificationRuleId() {
  const prisma = getPrisma()
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const count = await prisma.notificationRule.count({
    where: {
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  })
  
  const serial = String(count + 1).padStart(3, '0')
  return `NOT-${dateStr}-${serial}`
}
