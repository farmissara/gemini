import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Category = 'attendance' | 'homework' | 'announcement' | 'billing';
type Action = 'subscribe' | 'unsubscribe' | 'disable-all' | 'notify';

function respond(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isCategory(value: unknown): value is Category {
  return value === 'attendance' || value === 'homework' || value === 'announcement' || value === 'billing';
}

function isAllowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && [
      'fcm.googleapis.com',
      'updates.push.services.mozilla.com',
      'push.services.mozilla.com',
      'web.push.apple.com',
    ].includes(url.hostname);
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond(405, { error: 'Method not allowed.' });

  const authorization = request.headers.get('Authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return respond(401, { error: 'Sign in before managing app notifications.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration for parent-private-push.');
    return respond(500, { error: 'Private app notifications are not configured.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return respond(401, { error: 'Your session is invalid or expired.' });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(400, { error: 'Request body must be valid JSON.' });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: actor, error: actorError } = await serviceClient
    .from('user_profiles')
    .select('id, role, school_id, status')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (actorError) {
    console.error('Could not load notification actor profile:', actorError.message);
    return respond(500, { error: 'Could not verify your account.' });
  }
  if (!actor || actor.status !== 'active') return respond(403, { error: 'Your account is not active.' });

  const action = payload.action as Action;
  if (action === 'subscribe' || action === 'unsubscribe' || action === 'disable-all') {
    if (actor.role !== 'parent') return respond(403, { error: 'Only parent accounts can register app notifications.' });

    if (action === 'disable-all') {
      const { error } = await serviceClient
        .from('parent_push_subscriptions')
        .delete()
        .eq('profile_id', actor.id);
      if (error) {
        console.error('Could not remove parent push subscriptions:', error.message);
        return respond(500, { error: 'Could not turn off app notifications for this account.' });
      }
      return respond(200, { ok: true });
    }

    const { count: linkedStudents, error: linksError } = await serviceClient
      .from('parent_student_links')
      .select('student_id', { count: 'exact', head: true })
      .eq('profile_id', actor.id);
    if (linksError) {
      console.error('Could not verify linked students for push subscription:', linksError.message);
      return respond(500, { error: 'Could not verify the children linked to this account.' });
    }
    if (!linkedStudents) return respond(403, { error: 'Ask the school to link a student to this parent account first.' });

    const subscription = payload.subscription;
    if (!subscription || typeof subscription !== 'object') {
      return respond(400, { error: 'A valid browser push subscription is required.' });
    }

    const endpoint = (subscription as Record<string, unknown>).endpoint;
    if (!isAllowedPushEndpoint(endpoint)) return respond(400, { error: 'The push endpoint is not supported.' });

    if (action === 'unsubscribe') {
      const { error } = await serviceClient
        .from('parent_push_subscriptions')
        .delete()
        .eq('profile_id', actor.id)
        .eq('endpoint', endpoint);
      if (error) {
        console.error('Could not remove parent push subscription:', error.message);
        return respond(500, { error: 'Could not turn off app notifications on this device.' });
      }
      return respond(200, { ok: true });
    }

    const keys = (subscription as Record<string, unknown>).keys;
    const p256dh = keys && typeof keys === 'object' ? (keys as Record<string, unknown>).p256dh : null;
    const auth = keys && typeof keys === 'object' ? (keys as Record<string, unknown>).auth : null;
    if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) {
      return respond(400, { error: 'The browser push subscription is missing encryption keys.' });
    }

    const { data: existing, error: existingError } = await serviceClient
      .from('parent_push_subscriptions')
      .select('profile_id')
      .eq('endpoint', endpoint)
      .maybeSingle();
    if (existingError) {
      console.error('Could not verify existing push subscription:', existingError.message);
      return respond(500, { error: 'Could not verify the device registration.' });
    }
    if (existing && existing.profile_id !== actor.id) {
      return respond(409, { error: 'This device is already registered to another account. Turn off notifications there first.' });
    }

    const { error } = await serviceClient
      .from('parent_push_subscriptions')
      .upsert({
        profile_id: actor.id,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });
    if (error) {
      console.error('Could not save parent push subscription:', error.message);
      return respond(500, { error: 'Could not register this device for app notifications.' });
    }
    return respond(200, { ok: true });
  }

  if (action !== 'notify') return respond(400, { error: 'Unsupported notification action.' });
  if (!['admin', 'super_admin', 'teacher'].includes(actor.role)) {
    return respond(403, { error: 'Only school staff can send child-specific notifications.' });
  }

  const schoolId = typeof payload.schoolId === 'string' ? payload.schoolId.trim() : '';
  const studentId = typeof payload.studentId === 'string' ? payload.studentId.trim() : '';
  const eventId = typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
  const category = payload.category;
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (!schoolId || !studentId || !eventId || !isCategory(category) || !title || !body || title.length > 120 || body.length > 500) {
    return respond(400, { error: 'A valid school, student, event, category, title, and message are required.' });
  }
  if (actor.role !== 'super_admin' && actor.school_id !== schoolId) {
    return respond(403, { error: 'You can only notify parents from your own school.' });
  }

  const { data: student, error: studentError } = await serviceClient
    .from('students')
    .select('id, school_id')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (studentError) {
    console.error('Could not verify notification student:', studentError.message);
    return respond(500, { error: 'Could not verify the student record.' });
  }
  if (!student) return respond(404, { error: 'The student does not belong to this school.' });

  const { data: links, error: linksError } = await serviceClient
    .from('parent_student_links')
    .select('profile_id')
    .eq('school_id', schoolId)
    .eq('student_id', studentId);
  if (linksError) {
    console.error('Could not load linked parent accounts:', linksError.message);
    return respond(500, { error: 'Could not load the student’s linked parent accounts.' });
  }
  const parentIds = [...new Set((links || []).map((link) => link.profile_id))];
  if (parentIds.length === 0) return respond(200, { stored: 0, delivered: 0 });

  const [{ data: parents, error: parentsError }, { data: preferences, error: preferencesError }] = await Promise.all([
    serviceClient
      .from('user_profiles')
      .select('id')
      .in('id', parentIds)
      .eq('role', 'parent')
      .eq('status', 'active'),
    serviceClient
      .from('parent_notification_preferences')
      .select('profile_id, push_enabled, attendance_enabled, homework_enabled, announcement_enabled, billing_enabled')
      .in('profile_id', parentIds),
  ]);
  if (parentsError || preferencesError) {
    console.error('Could not load parent notification settings:', parentsError?.message || preferencesError?.message);
    return respond(500, { error: 'Could not load parent notification settings.' });
  }

  const preferenceById = new Map((preferences || []).map((item) => [item.profile_id, item]));
  const eligibleParents = (parents || []).filter((parent) => {
    const preference = preferenceById.get(parent.id);
    const enabled = preference
      ? preference[`${category}_enabled` as keyof typeof preference]
      : true;
    return enabled === true;
  });
  if (eligibleParents.length === 0) return respond(200, { stored: 0, delivered: 0 });

  const eventKey = `${schoolId}:${studentId}:${eventId}`;
  const { data: inserted, error: insertError } = await serviceClient
    .from('parent_notifications')
    .upsert(eligibleParents.map((parent) => ({
      recipient_profile_id: parent.id,
      school_id: schoolId,
      student_id: studentId,
      event_key: eventKey,
      category,
      title,
      body,
    })), {
      onConflict: 'recipient_profile_id,event_key',
      ignoreDuplicates: true,
    })
    .select('id');
  if (insertError) {
    console.error('Could not store parent notifications:', insertError.message);
    return respond(500, { error: 'Could not save the private notification.' });
  }

  const pushEnabledIds = eligibleParents
    .filter((parent) => preferenceById.get(parent.id)?.push_enabled === true)
    .map((parent) => parent.id);
  if (pushEnabledIds.length === 0) return respond(200, { stored: inserted?.length || 0, delivered: 0 });

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.error('Missing VAPID configuration for parent-private-push.');
    return respond(200, {
      stored: inserted?.length || 0,
      delivered: 0,
      failures: pushEnabledIds.length,
      pushConfigurationMissing: true,
    });
  }

  const { data: subscriptions, error: subscriptionsError } = await serviceClient
    .from('parent_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('profile_id', pushEnabledIds);
  if (subscriptionsError) {
    console.error('Could not load parent push subscriptions:', subscriptionsError.message);
    return respond(500, { error: 'Could not load registered parent devices.' });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const privatePayload = JSON.stringify({
    title: 'EduVerse',
    body: 'มีการแจ้งเตือนใหม่เกี่ยวกับบุตรหลาน',
    url: '/',
  });
  let delivered = 0;
  let failures = 0;

  await Promise.all((subscriptions || []).map(async (subscription) => {
    if (!isAllowedPushEndpoint(subscription.endpoint)) {
      failures += 1;
      console.error('Skipped an unsupported saved web push endpoint.');
      return;
    }
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, privatePayload, { TTL: 60 * 60, urgency: 'normal' });
      delivered += 1;
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode: unknown }).statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        const { error: deleteError } = await serviceClient
          .from('parent_push_subscriptions')
          .delete()
          .eq('id', subscription.id);
        if (deleteError) console.error('Could not remove an expired push subscription:', deleteError.message);
      } else {
        failures += 1;
        console.error('Could not deliver a parent push notification; status:', statusCode || 'unknown');
      }
    }
  }));

  return respond(200, {
    stored: inserted?.length || 0,
    delivered,
    failures,
  });
});
