# Turning on "Sign in with Google"

The game signs in with Google in the browser (Google Identity Services). It needs one public
setting: an OAuth **client ID**. Until it is set, the Google button is hidden and signing in by
name works as before.

1. Open https://console.cloud.google.com/ → choose or create a project.
2. **APIs & Services → OAuth consent screen**: user type *External*; app name "The Golden Thread";
   your support email; save. (Only the basic profile and email are used — no extra scopes.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorised JavaScript origins:
     - `https://azim12086atmes-s.github.io`
     - `http://localhost:5191` and `http://127.0.0.1:5191` (for testing locally)
   - No redirect URIs are needed.
4. Copy the client ID (it ends in `.apps.googleusercontent.com`) into a file named `.env` at the
   root of the repository:

   ```
   VITE_GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
   ```

   A client ID is public (it is in every page that uses it); it is not a secret.
5. Deploy as usual (`bash scripts/deploy-pages.sh`). The Sign in page (👤) now shows the button.

## What it does

- A player who has been playing without signing in keeps everything: the first Google sign-in on a
  device takes that journey with it (copied — the original stays as a backup).
- Someone already signed in by name has their journey linked to the Google account, unchanged.
- After that, signing in with Google on that device opens their journey.

## What it does not do (yet)

Journeys are kept in the browser on each device; there is no server. Google sign-in identifies
the player, it does not copy their journey between devices — use **Save my journey to a file** /
**Bring a journey from a file** for that. Syncing journeys across devices automatically needs a
small backend (for example Firebase Authentication + Firestore, which work with this same Google
sign-in); see `src/core/profiles.ts` for where it would plug in.
