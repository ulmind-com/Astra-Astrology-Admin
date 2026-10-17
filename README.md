# Astra Astrology — Admin

Two panels behind one sign-in: the **admin** panel, which opens and manages
astrologer accounts, and the **astrologer** panel, where an astrologer edits
their own profile. Which one you land on is decided by your role.

Next.js (App Router) + TypeScript + Tailwind v4, talking to the FastAPI backend.

## Running it

```bash
npm install
npm run dev -- --port 3001      # http://localhost:3001
```

The backend must be running (`uvicorn app.main:app --port 8000` in
`Astra-Astrology-Backend`). CORS is open (`ALLOWED_ORIGINS=*`).

`.env.local`:

| Variable | Meaning |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend origin, e.g. `http://localhost:8000` |
| `NEXT_PUBLIC_API_PREFIX` | API prefix, `/api/v1` |
| `NEXT_PUBLIC_APP_NAME` | Shown in the sidebar and page titles |

## The first admin

There is no sign-up here — for anyone. Create the first super admin from the
backend repo:

```bash
uv run python scripts/create_admin.py
```

Running it again on the same email promotes that account and resets its password.

## Pages

**Admin** (`admin`, `super_admin`)

| Route | What it does |
| --- | --- |
| `/dashboard` | Counts, recently added astrologers, backend health |
| `/astrologers` | Every astrologer, with status, rate and listing badges |
| `/astrologers/new` | Opens an account: Firebase + MongoDB + profile, then emails the password |
| `/astrologers/[id]` | Edit any astrologer: profile, rates, commission, listing, status |

**Astrologer** (`astrologer`)

| Route | What it does |
| --- | --- |
| `/me` | Own profile, photo, gallery, availability (online, chat, call) |
| `/me/password` | Change own password |

**Everyone**: `/login`, `/forgot-password`, `/reset-password`.

## Rules the UI follows

- **Astrologers cannot sign themselves up.** An admin creates the account; a
  welcome email carries the initial password. If mail is not configured, the
  create screen shows the password instead so the admin can pass it on — it is
  shown once and never again.
- An astrologer never sees admin pages. The sidebar hides them and the routes
  bounce back to `/me`; the backend also refuses with `403 insufficient_role`,
  which is the gate that actually matters.
- **Rates and commission are admin-only.** The astrologer's own page shows them
  read-only.
- Email cannot be changed after the account exists.
- Deactivating suspends the account and drops it from the public directory. It
  keeps the history — it is not a delete.

## How it is wired

- `src/lib/api/client.ts` — the only place that talks to the API. Unwraps the
  `{ success, message, data }` envelope, throws `ApiError` with `fieldErrors`.
  No token refresh (the backend has no refresh endpoint), so a 401 ends the
  session — except for 401s that mean "the password you just typed was wrong",
  so a typo in *Change password* does not sign you out.
- `src/providers/auth-provider.tsx` — holds the session and does the role routing.
- `src/types/api.d.ts` — **generated**, never edited by hand:

  ```bash
  npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts
  ```

## Checks

```bash
npx tsc --noEmit
npm run build
```
