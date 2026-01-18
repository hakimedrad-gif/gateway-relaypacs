// Authentication-related types

export interface LoginRequest {
  username: string;
  password: string;
  totp_code?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

export interface TOTPSetupResponse {
  secret: string;
  qr_code: string;
  provisioning_uri: string;
}

export interface TOTPEnableRequest {
  code: string;
  secret: string;
}

export interface TOTPResponse {
  success: boolean;
  enabled: boolean;
}
