import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';
import 'fake-indexeddb/auto';

// Mocking global fetch for API calls
vi.stubGlobal('fetch', vi.fn());

// Mock Cornerstone as it might have issues in jsdom
vi.mock('cornerstone-core', () => ({
  default: {
    // mock methods if used
  },
}));

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  __esModule: true,
  default: ({ children }: any) => children({ height: 1000, width: 1000 }),
}));

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemData }: any) => {
    return React.createElement(
      'div',
      { 'data-testid': 'virtual-list' },
      Array.from({ length: itemCount }).map((_, index) => {
        return React.createElement(
          'div',
          { key: index },
          typeof children === 'function'
            ? children({ index, style: {}, data: itemData })
            : React.createElement(children, { index, style: {}, data: itemData }),
        );
      }),
    );
  },
}));
