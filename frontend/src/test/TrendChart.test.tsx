import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TrendChart } from '../components/TrendChart';
import React from 'react';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'container' }, children),
  LineChart: ({ children, data }: { children: React.ReactNode; data: Record<string, unknown>[] }) =>
    React.createElement(
      'div',
      { 'data-testid': 'line-chart', 'data-data': JSON.stringify(data) },
      children,
    ),
  Line: () => React.createElement('div', { 'data-testid': 'line' }),
  XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
  YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
  CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
  Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
}));

describe('TrendChart Component', () => {
  const mockData = [
    { date: '2023-01-01', count: 5 },
    { date: '2023-01-02', count: 10 },
  ];

  it('renders the chart with correct title and data', () => {
    render(React.createElement(TrendChart, { data: mockData, period: 'Last 7 Days' }));

    expect(screen.getByText(/Upload Trends \(Last 7 Days\)/i)).toBeDefined();
    expect(screen.getByTestId('line-chart')).toBeDefined();

    // Check if data was passed correctly to LineChart mock
    const chart = screen.getByTestId('line-chart');
    expect(chart.getAttribute('data-data')).toBe(JSON.stringify(mockData));
  });
});
