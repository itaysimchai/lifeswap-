import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  GoogleAuthProvider,
  OAuthProvider,
  browserPopupRedirectResolver,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { publicConfig } from '@/lib/public-config';

interface AppleSignInPlugin {
  authorize(options: { nonce: string }): Promise<{ identityToken: string; displayName: string; email: string }>;
}
interface GoogleSignInPlugin {
  authorize(options: { clientId: string }): Promise<{ idToken: string; accessToken: string }>;
}
const AppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn');
const GoogleSignIn = registerPlugin<GoogleSignInPlugin>('GoogleSignIn');

const googleIosClientId: string =
  process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID || publicConfig.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export type SocialResult = { cred: UserCredential; displayName?: string };

const isIos = () => Capacitor.getPlatform() === 'ios';

// Off until we have owner access to the Firebase project: the Apple provider
// isn't enabled there and there is no iOS OAuth client for Google yet.
const SOCIAL_SIGN_IN_ENABLED = false;

/** Sign in with Apple runs through the native sheet, so it is offered on iOS only. */
export function appleSignInAvailable() {
  return SOCIAL_SIGN_IN_ENABLED && isIos() && Capacitor.isPluginAvailable('AppleSignIn');
}

/** Web uses Firebase's popup; iOS needs the native plugin and an iOS OAuth client. */
export function googleSignInAvailable() {
  if (!SOCIAL_SIGN_IN_ENABLED) return false;
  if (!Capacitor.isNativePlatform()) return true;
  return isIos() && Capacitor.isPluginAvailable('GoogleSignIn') && googleIosClientId.length > 0;
}

// Native plugin failures carry "canceled" / "failed" / "unconfigured"; map them
// onto Firebase codes so authErrorMessage has one vocabulary to translate.
function nativeError(e: unknown): never {
  const code = (e as { code?: string })?.code;
  throw Object.assign(new Error((e as Error)?.message ?? 'Sign-in failed'), {
    code: code === 'canceled' ? 'auth/popup-closed-by-user'
      : code === 'unconfigured' ? 'auth/operation-not-allowed'
      : 'auth/internal-error',
  });
}

const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

/**
 * Apple signs the hashed nonce into the identity token; Firebase checks it
 * against the raw one, which ties the token to this request.
 * Resolves the display name alongside the credential because Apple only
 * reveals it on the very first authorization.
 */
export async function signInWithApple(): Promise<SocialResult> {
  const rawNonce = hex(crypto.getRandomValues(new Uint8Array(32)));
  const hashed = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce))));
  const result = await AppleSignIn.authorize({ nonce: hashed }).catch(nativeError);
  const credential = new OAuthProvider('apple.com').credential({ idToken: result.identityToken, rawNonce });
  const cred = await signInWithCredential(auth, credential);
  const displayName = result.displayName.trim() || undefined;
  if (displayName && !cred.user.displayName) await updateProfile(cred.user, { displayName }).catch(() => {});
  return { cred, displayName };
}

export async function signInWithGoogle(): Promise<SocialResult> {
  if (!Capacitor.isNativePlatform()) {
    // The resolver loads the authDomain iframe, which is what hangs auth when
    // installed at startup (see lib/firebase.ts). Passing it per call keeps
    // that cost behind the button.
    const cred = await signInWithPopup(auth, new GoogleAuthProvider(), browserPopupRedirectResolver);
    return { cred };
  }
  const result = await GoogleSignIn.authorize({ clientId: googleIosClientId }).catch(nativeError);
  const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(result.idToken, result.accessToken || undefined));
  return { cred };
}
