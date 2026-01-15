import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Settings } from '../pages/Settings';
import { totpApi } from '../services/api';
import React from 'react';

// Mock totpApi
vi.mock('../services/api', () => ({
  totpApi: {
    setup: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  },
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(React.createElement(Settings));
    expect(screen.getByText('Security')).toBeDefined();
    expect(screen.getByText(/Enable 2FA/i)).toBeDefined();
  });

  it('handles 2FA setup flow', async () => {
    (totpApi.setup as Mock).mockResolvedValue({
      secret: 'SECRET123',
      qr_code: 'data:image/png;base64,...',
      provisioning_uri: 'otpauth://...',
    });

    render(React.createElement(Settings));

    const enableBtn = screen.getByText(/Enable 2FA/i);
    fireEvent.click(enableBtn);

    await waitFor(() => {
      expect(screen.getByAltText('2FA QR Code')).toBeDefined();
      expect(screen.getByPlaceholderText('000 000')).toBeDefined();
    });
  });

  it('handles 2FA verification', async () => {
    (totpApi.setup as Mock).mockResolvedValue({
      secret: 'SECRET123',
      qr_code: 'qr',
      provisioning_uri: 'uri',
    });
    (totpApi.enable as Mock).mockResolvedValue({ success: true });

    render(React.createElement(Settings));

    fireEvent.click(screen.getByText(/Enable 2FA/i));

    await waitFor(() => screen.getByPlaceholderText('000 000'));

    const input = screen.getByPlaceholderText('000 000');
    fireEvent.change(input, { target: { value: '123456' } });

    const verifyBtn = screen.getByText(/Verify & Enable/i);
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(totpApi.enable).toHaveBeenCalledWith('123456', 'SECRET123');
      expect(screen.getByText(/Two-Factor Authentication enabled!/i)).toBeDefined();
      expect(screen.getByText(/Disable 2FA/i)).toBeDefined();
    });
  });

  it('handles disabling 2FA', async () => {
    (totpApi.setup as Mock).mockResolvedValue({ secret: 'S', qr_code: 'Q', provisioning_uri: 'U' });
    (totpApi.enable as Mock).mockResolvedValue({ success: true });
    (totpApi.disable as Mock).mockResolvedValue({ success: true });

    render(React.createElement(Settings));

    // Enable it first
    fireEvent.click(screen.getByText(/Enable 2FA/i));
    await waitFor(() => screen.getByPlaceholderText('000 000'));
    fireEvent.change(screen.getByPlaceholderText('000 000'), { target: { value: '123456' } });
    fireEvent.click(screen.getByText(/Verify & Enable/i));
    await waitFor(() => screen.getByText(/Disable 2FA/i));

    // Now disable it
    fireEvent.click(screen.getByText(/Disable 2FA/i));
    await waitFor(() => {
      expect(totpApi.disable).toHaveBeenCalled();
      expect(screen.getByText(/Two-Factor Authentication disabled\./i)).toBeDefined();
    });
  });
});
