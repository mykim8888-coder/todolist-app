export interface User {
  id: string;
  email: string | null;
  name: string;
  auth_provider: 'local' | 'google' | 'facebook';
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  name?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface DeleteAccountRequest {
  password: string;
}
