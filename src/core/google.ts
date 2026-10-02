/**
 * Google sign-in (Google Identity Services, in the browser — there is no server). The OAuth client
 * id is public: set it in `.env` as VITE_GOOGLE_CLIENT_ID (see docs/GOOGLE_SIGN_IN.md). Until it is
 * set, the Sign in with Google button is not shown and signing in by name works as before.
 */
export const GOOGLE_CLIENT_ID: string = (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

interface Gis { accounts: { id: { initialize(o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }): void; renderButton(el: HTMLElement, o: Record<string, unknown>): void } } }

let loading: Promise<Gis | null> | null = null;

/** Load Google's sign-in script once (null if it cannot be reached, e.g. offline). */
export function loadGoogle(): Promise<Gis | null> {
  const w = window as unknown as { google?: Gis };
  if (w.google?.accounts) return Promise.resolve(w.google);
  return (loading ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve(w.google ?? null);
    s.onerror = () => { loading = null; resolve(null); };
    document.head.append(s);
  }));
}

/** Put Google's own button in `el`; `onCredential` receives the ID token when they sign in. */
export async function googleButton(el: HTMLElement, onCredential: (credential: string) => void): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID) return false;
  const g = await loadGoogle();
  if (!g) return false;
  g.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => onCredential(r.credential) });
  g.accounts.id.renderButton(el, { theme: 'filled_black', shape: 'pill', size: 'large', text: 'signin_with', logo_alignment: 'left' });
  return true;
}
