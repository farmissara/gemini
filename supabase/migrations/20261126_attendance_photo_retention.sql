-- The scheduled job remains idle until both Supabase Vault secrets are present.
-- Deploy the attendance-photo-retention Edge Function before adding them:
--   attendance_photo_cleanup_url    = https://<project-ref>.supabase.co
--   attendance_photo_cleanup_secret = the same random value as the function secret
-- The function removes Storage objects older than 24 hours and clears photo_url;
-- attendance rows remain intact.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'attendance-photo-retention-hourly';

SELECT cron.schedule(
  'attendance-photo-retention-hourly',
  '15 * * * *',
  $job$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'attendance_photo_cleanup_url')
             || '/functions/v1/attendance-photo-retention',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'attendance_photo_cleanup_secret')
      ),
      body := '{}'::jsonb
    )
    WHERE EXISTS (
      SELECT 1 FROM vault.decrypted_secrets WHERE name = 'attendance_photo_cleanup_url'
    )
      AND EXISTS (
        SELECT 1 FROM vault.decrypted_secrets WHERE name = 'attendance_photo_cleanup_secret'
      );
  $job$
);
