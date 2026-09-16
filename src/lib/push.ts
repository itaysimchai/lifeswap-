import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from './firebase';

/* Remote push, straight to APNs - no Firebase Cloud Messaging.
   The plugin hands back the raw APNs device token on iOS, and the sender
   (functions/src/push.ts) signs its own JWT with the .p8 key, so the app needs
   neither GoogleService-Info.plist nor the Firebase iOS SDK in the native
   project. One less thing to keep in sync, one less native dependency. */

export type PushState = 'unsupported' | 'unknown' | 'prompt' | 'granted' | 'denied';

/** Tokens live per device, so a user signed in on two phones gets both. */
function tokenDoc(uid: string, token: string) {
  return doc(db, 'users', uid, 'pushTokens', token);
}

/**
 * Three outcomes, and they need three different things said to the user:
 * `web` is a browser preview of the app, `outdated` is the real app running a
 * build from before the plugin existed, and `supported` is the live path.
 * Collapsing these into one boolean is how the app ended up telling people,
 * inside the app, that notifications were available in the app.
 */
export type PushAvailability = 'supported' | 'web' | 'outdated';

export function pushAvailability(): PushAvailability {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Capacitor.isPluginAvailable('PushNotifications') ? 'supported' : 'outdated';
}

export function pushSupported() {
  return pushAvailability() === 'supported';
}

async function saveToken(uid: string, token: string) {
  await setDoc(
    tokenDoc(uid, token),
    { token, platform: 'ios', updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Registration is a two-step handshake: `register()` only asks iOS to talk to
 * APNs, and the token arrives later on the `registration` event. Resolve on
 * whichever of registration/error lands first so the UI can never hang on a
 * toggle that silently never completed.
 */
function registerForToken(timeoutMs = 15_000): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const handles: { remove: () => void }[] = [];
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      for (const handle of handles) handle.remove();
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error('Apple did not return a device token. Please try again.'))),
      timeoutMs
    );
    void PushNotifications.addListener('registration', (t: Token) =>
      finish(() => resolve(t.value))
    ).then(h => handles.push(h));
    void PushNotifications.addListener('registrationError', (e: { error: string }) =>
      finish(() => reject(new Error(e?.error || 'Could not register for notifications.')))
    ).then(h => handles.push(h));
    void PushNotifications.register().catch(error => finish(() => reject(error)));
  });
}

/**
 * Delivery side effects that should run for the whole session, not just while
 * Settings is mounted: opening a notification navigates to what it is about.
 */
export function installPushRouting(navigate: (to: string) => void) {
  if (!pushSupported()) return () => {};
  const handles: { remove: () => void }[] = [];
  let disposed = false;
  const add = (p: Promise<{ remove: () => void }>) =>
    void p.then(h => (disposed ? h.remove() : handles.push(h)));

  add(
    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const route = action.notification?.data?.route;
      if (typeof route === 'string' && route.startsWith('/')) navigate(route);
      void PushNotifications.removeAllDeliveredNotifications().catch(() => {});
    })
  );
  return () => {
    disposed = true;
    for (const handle of handles) handle.remove();
  };
}

/** Drops this device's token - call on sign-out so the next user is not paged. */
export async function forgetPushToken(uid: string, token: string | null) {
  if (!token || !pushSupported()) return;
  await deleteDoc(tokenDoc(uid, token)).catch(() => {});
  await PushNotifications.unregister().catch(() => {});
}

export function usePushNotifications(uid: string | undefined) {
  const [state, setState] = useState<PushState>(() => (pushSupported() ? 'unknown' : 'unsupported'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    let disposed = false;
    void PushNotifications.checkPermissions()
      .then(result => {
        if (disposed) return;
        setState(result.receive === 'granted' ? 'granted' : result.receive === 'denied' ? 'denied' : 'prompt');
      })
      .catch(() => !disposed && setState('prompt'));
    return () => {
      disposed = true;
    };
  }, []);

  // A granted permission is not a delivered token: iOS can revoke registration
  // between launches, so re-register whenever we know who the user is.
  useEffect(() => {
    if (state !== 'granted' || !uid || token.current) return;
    let disposed = false;
    void registerForToken()
      .then(value => {
        if (disposed) return;
        token.current = value;
        return saveToken(uid, value);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [state, uid]);

  const enable = useCallback(async () => {
    if (!uid || !pushSupported()) return;
    setBusy(true);
    setError(null);
    try {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        setState('denied');
        setError('Notifications are turned off for LifeSwap. Enable them in iOS Settings to get alerts.');
        return;
      }
      const value = await registerForToken();
      token.current = value;
      await saveToken(uid, value);
      setState('granted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn on notifications.');
    } finally {
      setBusy(false);
    }
  }, [uid]);

  const disable = useCallback(async () => {
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      await forgetPushToken(uid, token.current);
      token.current = null;
      // iOS keeps the permission itself; only delivery to this app stops.
      setState('prompt');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn off notifications.');
    } finally {
      setBusy(false);
    }
  }, [uid]);

  return { state, busy, error, enable, disable, availability: pushAvailability(), supported: pushSupported() };
}
