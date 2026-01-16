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
vi.mock('react-virtualized-auto-sizer', () => {
  const AutoSizer = ({
    children,
  }: {
    children: (props: { height: number; width: number }) => React.ReactNode;
  }) => children({ height: 1000, width: 1000 });

  return {
    __esModule: true,
    AutoSizer,
    default: AutoSizer,
  };
});

// Mock react-window
vi.mock('react-window', () => {
  const MockList = ({
    children,
    itemCount,
    itemData,
  }: {
    children: (props: {
      index: number;
      style: React.CSSProperties;
      data: unknown;
    }) => React.ReactNode;
    itemCount: number;
    itemData: unknown;
  }) => {
    return React.createElement(
      'div',
      { 'data-testid': 'virtual-list' },
      Array.from({ length: itemCount || 0 }).map((_, index) => {
        return React.createElement(
          'div',
          { key: index },
          typeof children === 'function'
            ? children({ index, style: {}, data: itemData })
            : //@ts-ignore
              React.createElement(children, { index, style: {}, data: itemData }),
        );
      }),
    );
  };

  return {
    __esModule: true,
    List: MockList,
    FixedSizeList: MockList,
    VariableSizeList: MockList,
  };
});
