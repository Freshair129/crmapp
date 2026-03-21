/**
 * Task domain constants — shared between route.js and [id]/route.js
 * Priority levels: L0 (Critical) → L5 (Optional)
 */

export const VALID_PRIORITIES = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];
export const VALID_STATUSES   = ['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
export const VALID_TYPES      = ['FOLLOW_UP', 'MEETING', 'CALL', 'EMAIL', 'PURCHASE', 'REVIEW', 'OTHER'];
