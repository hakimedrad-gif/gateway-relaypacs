import '@testing-library/jest-dom';
import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Mock IndexedDB if needed, though Dexie with jsdom usually works
// Mocking global fetch for API calls
global.fetch = vi.fn();

// Mock Cornerstone as it might have issues in jsdom
vi.mock('cornerstone-core', () => ({
  default: {
    // mock methods if used
  }
}));
