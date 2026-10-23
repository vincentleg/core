# Founder account — configured backend (2026-10-22)

Supersedes the 2026-10-21 "configuration blocked" version of this document.

## What is configured

- **Supabase project:** existing `CORE`, ref `kuvhrwcgknltjtofouws` (free plan, us-east-2). No second project or account created.
- **Founder identity:** the existing, already-confirmed Auth user (the project's only user). UUID `<founder auth user id; kept out of the repository>`. No password created or reset.
- **Auth settings:** Site URL `https://creationofrebornearth.com` and redirect allowlist `https://creationofrebornearth.com/**` unchanged. Public sign-up **disabled** (`enable_signup=false`, pushed alone with `supabase config push`; all other settings untouched). Email templates are the provider defaults: the free plan refuses template edits without custom SMTP, and no paid plan or new email provider was added.
- **Database:** `scripts/account/schema.sql` applied once. Membership row for the founder UUID and one workspace row (validated private seed: profile, [private prospect] as **prospect**, 20 synthetic agent tasks) inserted by the administrator. The seed never enters Git or static assets.
- **Vercel production variables** (encrypted, `vincentleg/core`): `CORE_SUPABASE_URL`, `CORE_SUPABASE_PUBLISHABLE_KEY` (publishable key only; secret/legacy keys are rejected by the handler), `CORE_FOUNDER_USER_ID`, `CORE_FOUNDER_EMAIL`, `CORE_ACCOUNT_ORIGIN`. No service-role key exists anywhere in the deployment.

## Sign-in flow (email link + PKCE, no password)

1. My CORE → *Send sign-in link*. `/api/account/login` always answers `{sent:true}` and sets a fresh HttpOnly `__Host-core_pkce` verifier cookie (15 min), whatever the address, so the response does not reveal who is authorized. Only the configured founder address triggers a provider request (`create_user:false`, S256 code challenge, `redirect_to=<origin>/me.html`).
2. The default Supabase "magic link" email opens Supabase's verifier, which redirects to `me.html?code=…`. The page erases the code from the address bar before any request and posts it to `/api/account/callback`.
3. The server exchanges code + verifier (`grant_type=pkce`), then checks the provider user ID equals `CORE_FOUNDER_USER_ID` **and** the membership row is visible under RLS. Only then is the access token set as the HttpOnly/Secure/SameSite=Strict `__Host-core_account` cookie (≤ 1 hour). No token reaches JavaScript, URLs or browser storage.
4. The link must be opened in the same browser that requested it (the verifier lives there). Expired, reused or foreign links return *link expired — request a new one*.
5. **Recovery:** there is no password; request a new link. **Logout** revokes the provider session, then confirms that RLS already denies the same token before clearing the cookie.

The token-hash callback (`#token_hash=…&type=invite|email`) remains supported for a future custom-SMTP template; with default templates, admin invitations arrive with URL tokens, which the client deliberately refuses. The founder is already confirmed, so no invitation is needed.

## Database isolation

RLS on both tables; `anon` has no privileges; `authenticated` may only SELECT its own membership and SELECT/UPDATE its own workspace, and only while `auth.jwt().session_id` is still present in `auth.sessions` (security-definer helper in the unexposed `core_private` schema). No INSERT/DELETE grants; membership is not self-grantable.

## Verification commands (administrator, Supabase CLI logged in)

- `npx -y supabase@2.121.0 db query --linked --project-ref kuvhrwcgknltjtofouws -f scripts/account/rls-check.sql` — 9 rolled-back checks: anon denied, other user reads/updates nothing, insert/delete denied, founder with revoked/forged session reads/updates nothing.
- `CORE_FOUNDER_EMAIL=<founder address> node scripts/account/live-denials.mjs` — 13 real-provider checks (anonymous REST read/insert/update, private function not exposed, sign-up disabled, forged bearer, handler forged session/PKCE/token-hash, cross-origin, non-founder login). Sends no email.

## Release packaging

`node scripts/account/build-release.mjs` builds `public/` and packages it with six isolated `/api/account/*` Node functions as Vercel Build Output (`public/.vercel/output`); deploy with `cd public && vercel deploy --prebuilt --prod`. Server source and private files never become static assets.

## Limitations

- Session lasts at most one hour; there is no silent refresh by design. Request a new link afterwards.
- Supabase's default email sender is rate-limited on the free plan (a few emails per hour); request links sparingly.
- Non-founder isolation is proven at the database (role/claim simulation inside the live database) and by the handler's UUID check; no second real user was created (public sign-up is disabled).
