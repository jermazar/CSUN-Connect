# Campus Social — Monorepo (Web + Mobile) with Sign-In

## Prereqs
- Node.js 18+
- pnpm: `npm i -g pnpm` (or `corepack enable && corepack prepare pnpm@latest --activate`)
- Supabase project URL + anon key

## Setup
1. `pnpm install`
2. Copy envs:
   - `cp apps/web/.env.local.example apps/web/.env.local` → set `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`
   - `cp apps/mobile/.env.example apps/mobile/.env` → set `EXPO_PUBLIC_SUPABASE_URL/ANON_KEY`
3. Run web: `pnpm dev:web` (http://localhost:3000)
4. Sign in at **Header → Sign In** with an email/password user from Supabase.
5. Run mobile: `pnpm dev:mobile` (Expo) when ready.

## Shared packages
- `@campus/shared`: Zod validators, types
- `@campus/data`: Supabase client + React Query hooks + auth helpers
- `@campus/ui`: Universal React Native components
