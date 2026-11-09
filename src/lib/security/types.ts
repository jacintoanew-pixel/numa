export interface UserSession {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  provider: "google" | "apple" | "email" | "local";
  isVerified: boolean;
  linkedAt: string;
  role: "owner" | "admin" | "viewer";
}

export interface TwoFactorState {
  isEnabled: boolean;
  secret?: string;
  verifiedAt?: string;
  backupCodes: string[];
  requireForSensitiveActions: boolean;
}

export interface SecurityConfig {
  autoLockMinutes: number; // 5 min bank timeout
  requirePin: boolean;
  pinHash?: string;
  privacyBlurOnUnfocus: boolean;
  biometricEnabled: boolean;
  lastActiveTimestamp: number;
}

export interface DeviceSession {
  id: string;
  deviceName: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  isCurrent: boolean;
  lastActive: string;
}
