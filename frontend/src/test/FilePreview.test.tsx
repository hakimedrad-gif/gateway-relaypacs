import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FilePreview } from '../components/FilePreview';
import React from 'react';

describe('FilePreview Component', () => {
  it('renders file name and size correctly', () => {
    render(React.createElement(FilePreview, { fileName: 'test.dcm', fileSize: 1024 * 1024 }));

    expect(screen.getByText('test.dcm')).toBeDefined();
    expect(screen.getByText('1.00 MB')).toBeDefined();
  });

  it('renders KB size correctly', () => {
    render(React.createElement(FilePreview, { fileName: 'test.dcm', fileSize: 2048 }));
    expect(screen.getByText('2.00 KB')).toBeDefined();
  });

  it('renders B size correctly', () => {
    render(React.createElement(FilePreview, { fileName: 'test.dcm', fileSize: 512 }));
    expect(screen.getByText('512 B')).toBeDefined();
  });

  it('renders metadata if provided', () => {
    const metadata = {
      patientName: 'John Doe',
      modality: 'CT',
      studyDate: '2023-01-01',
      studyDescription: 'Head Scan',
    };

    render(React.createElement(FilePreview, { fileName: 'test.dcm', fileSize: 1024, metadata }));

    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('CT')).toBeDefined();
    expect(screen.getByText('2023-01-01')).toBeDefined();
    expect(screen.getByText('Head Scan')).toBeDefined();
  });

  it('handles missing optional metadata', () => {
    const metadata = {
      modality: 'MR',
    };

    render(React.createElement(FilePreview, { fileName: 'test.dcm', fileSize: 1024, metadata }));

    expect(screen.getByText('MR')).toBeDefined();
    expect(screen.queryByText(/Patient:/i)).toBeNull();
  });
});
