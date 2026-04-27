import { User } from './user.model';

export type SettingsDensity = 'Compact' | 'Comfortable';
export type SettingsAppearance = 'dark' | 'light';

export interface UserSettings {
  timezone: string;
  density: SettingsDensity;
  appearance: SettingsAppearance;
  autosave: boolean;
  twoFactor: boolean;
}

export interface MySettingsResponse {
  user: User;
  settings: UserSettings;
}

export interface UpdateMySettingsPayload {
  name?: string;
  email?: string;
  timezone?: string;
  density?: SettingsDensity;
  appearance?: SettingsAppearance;
  autosave?: boolean;
  twoFactor?: boolean;
}
