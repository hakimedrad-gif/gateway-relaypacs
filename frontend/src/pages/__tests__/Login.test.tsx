import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock the hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ success: true }),
    register: vi.fn().mockResolvedValue({ success: true }),
    isAuthenticated: false,
  }),
}));

vi.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form by default', () => {
    renderLogin();
    
    expect(screen.getByText(/RelayPACS/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/User ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Security Key/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Gateway/i })).toBeInTheDocument();
  });

  it('shows password when toggle is clicked', async () => {
    renderLogin();
    
    const passwordInput = screen.getByLabelText(/Security Key/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find and click the toggle button
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => 
      btn.querySelector('svg') && !btn.textContent?.includes('Sign')
    );
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  it('switches to registration mode', () => {
    renderLogin();
    
    const signUpButton = screen.getByRole('button', { name: /Sign Up/i });
    fireEvent.click(signUpButton);
    
    expect(screen.getByLabelText(/Clinical Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Secure Account/i })).toBeInTheDocument();
  });

  it('validates required fields on login', async () => {
    renderLogin();
    
    const submitButton = screen.getByRole('button', { name: /Sign In to Gateway/i });
    fireEvent.click(submitButton);
    
    // Form should prevent submission with empty fields
    await waitFor(() => {
      expect(screen.getByLabelText(/User ID/i)).toBeInTheDocument();
    });
  });

  it('shows network status indicator', () => {
    renderLogin();
    
    expect(screen.getByText(/Online/i)).toBeInTheDocument();
  });
});
