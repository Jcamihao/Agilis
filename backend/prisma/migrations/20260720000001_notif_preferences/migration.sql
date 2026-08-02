-- Add notification preferences to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notif_preferences" JSONB;
