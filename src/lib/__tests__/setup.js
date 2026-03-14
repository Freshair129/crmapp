import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock logger to avoid noise in tests
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));
