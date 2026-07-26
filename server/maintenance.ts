import { getDb } from './db';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'ARIA is making changes to the HRMS. No one will be able to clock out today. Please use your email for communication.';

export type MaintenanceConfig = {
  enabled: boolean;
  message: string;
  /** When true, managers/admins can still use the app */
  allowAdminBypass: boolean;
  blockClockOut: boolean;
};

export function getMaintenanceConfig(): MaintenanceConfig {
  const db = getDb();
  const settings = db.orgSettings as {
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    maintenanceAllowAdmin?: boolean;
  };

  // Env wins: MAINTENANCE_MODE=true|false
  const env = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  let enabled = Boolean(settings.maintenanceMode);
  if (env === 'true' || env === '1' || env === 'yes') enabled = true;
  if (env === 'false' || env === '0' || env === 'no') enabled = false;

  return {
    enabled,
    message: (settings.maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE).trim(),
    allowAdminBypass: settings.maintenanceAllowAdmin !== false,
    // Clock-out is only blocked while maintenance mode is active
    blockClockOut: enabled,
  };
}

export function isMaintenanceEnabled(): boolean {
  return getMaintenanceConfig().enabled;
}

/** One-time campaign: turn maintenance OFF and keep it off across restarts */
const LIVE_CAMPAIGN = 'live-2026-07-25';

export function applyMaintenanceDefaults(orgSettings: {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  maintenanceAllowAdmin?: boolean;
  maintenanceCampaignId?: string;
}): void {
  if (orgSettings.maintenanceAllowAdmin === undefined) {
    orgSettings.maintenanceAllowAdmin = true;
  }
  // Go live: disable maintenance once for this campaign (does not re-enable on restart)
  if (orgSettings.maintenanceCampaignId !== LIVE_CAMPAIGN) {
    orgSettings.maintenanceMode = false;
    orgSettings.maintenanceCampaignId = LIVE_CAMPAIGN;
  }
}