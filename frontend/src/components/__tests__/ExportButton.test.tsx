import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportButton } from '../ExportButton';
import '@testing-library/jest-dom';

describe('ExportButton', () => {
  it('renders export button with default text', () => {
    const mockExport = vi.fn();
    render(<ExportButton onExport={mockExport} />);

    const button = screen.getByText('Export CSV');
    expect(button).toBeInTheDocument();
  });

  it('calls onExport when clicked', () => {
    const mockExport = vi.fn();
    render(<ExportButton onExport={mockExport} />);

    const button = screen.getByText('Export CSV');
    fireEvent.click(button);

    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading', () => {
    const mockExport = vi.fn();
    render(<ExportButton onExport={mockExport} loading={true} />);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
  });

  it('disables button when loading', () => {
    const mockExport = vi.fn();
    render(<ExportButton onExport={mockExport} loading={true} />);

    const button = screen.getByText('Exporting...') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
