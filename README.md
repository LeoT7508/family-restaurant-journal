# Family Table Journal

A private, mobile-first restaurant journal for one family: log visits, dishes, wine and what the kids liked, and decide where to eat. Front end only for now. Data lives in your browser (localStorage) behind swappable interfaces, so a real back end (Supabase) can be connected later.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run typecheck  # tsc, strict mode
npm run lint       # ESLint
npm run build      # production build
```

Open **Profile → Sample data** to restore the sample journal, or start with an empty journal to see the first-run experience.

## What it does

- **Log:** quick log in a few taps (restaurant, stars, one photo, note) that saves as a draft; full visit page with dishes (per-person verdicts), wine (each parent rates), kid info, price with per-person cost, occasion, go-again, and separate parent ratings.
- **Find:** Journal with search and filters (cuisine, kid-friendly, Safe for Mia, drive time, occasion, go-again, near home or trips); list plus detail side by side on a laptop. Wine tab with favorites. Restaurant pages.
- **Decide:** Where tonight? (3 questions, 3 ideas, journal and wishlist first), Wishlist with "mark as visited", map view, and ideas from your history on Home.
- **Look back and keep:** Year in review, export (CSV and full JSON backup), share cards (food only).
- **Maintain:** edit or delete visits and restaurants, merge duplicates, flag closed restaurants, edit family and home base.
- **Travel mode:** away from home, places you add are tagged to the trip, drive time from home is ignored, and Where tonight? suggests only places from that trip.

All four build phases from the original brief are done.

## Folder structure

```
src/
  components/ui/        Reusable building blocks (Button, Card, Badge, Chip, Input, Select,
                        Tabs, BottomSheet, Rating, EmptyState, ErrorState, Skeleton, Toast, Icon)
  components/features/  App-specific pieces (AppShell, VisitCard, QuickLogForm, ...)
  data/repositories/    INTERFACES ONLY: what the UI is allowed to ask for
  data/mock/            In-memory + localStorage implementations and seed data
  data/DataProvider.tsx The single place that picks which implementation is used
  hooks/                TanStack Query hooks; the only way components reach data
  pages/                One file per screen
  services/             PlacesService interface (+ mock in services/mock)
  types/                Zod schemas and inferred TypeScript types
  lib/                  Pure helpers (formatting, allergy rules)
  styles/               tokens.css (design tokens) and index.css
```

## Design tokens

All colors, radii, shadows and layout sizes are CSS variables in `src/styles/tokens.css`, with a `.dark` override. `tailwind.config.ts` maps them to Tailwind classes (`bg-canvas`, `text-ink`, `bg-accent`, ...). To change the theme, edit `tokens.css` only. Components never use raw color values.

The palette comes from a reference site: white surfaces, charcoal text, deep-teal pill buttons, teal as the accent, orange for stars and highlights, and soft lavender for insets. The bright reference teal is used for fills only; a darker teal is used for text and links so it stays readable. A test (`src/styles/tokens.test.ts`) checks every text/background pair against WCAG AA in both light and dark, so a theme edit that hurts contrast fails the build.

The type scale is small (15px body) and uses regular, medium and semibold weights only.

## Connect to Supabase

The app runs on sample data in your browser until Supabase is configured, then it switches over by itself. It uses real sign-in (email and password), and every row is locked to your household with row-level security.

1. **Create the tables.** In the Supabase dashboard open **SQL Editor → New query**, paste the whole of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it. It is safe to run twice. It creates the tables, the security rules, the setup functions and a private `photos` bucket.
2. **Add the keys.** Copy `.env.example` to `.env.local` and set:
   - `VITE_SUPABASE_URL` (your project URL)
   - `VITE_SUPABASE_ANON_KEY` (the public **anon / publishable** key from **Project Settings → API Keys**)

   Never use the `service_role` or secret key. It bypasses every security rule, and the app refuses to start if it sees one.

3. **Restart** `npm run dev`. The sign-in page appears with a live **Backend connection** check: it shows whether the project is reachable, accepts your key, and has the tables. If the URL is set but the key is missing, the app shows an "Almost connected" screen instead of quietly using sample data.
4. **Set up the household.** Create an account, choose "Start a new journal" (it starts with Alex, Sam, Max and Mia), and pick which parent you are. Your partner then creates their own account, chooses "Join your partner", and enters the invite code shown in **Profile**.

You can sign out from the app header (phone) or sidebar (laptop) and from Profile, which also shows the connection check.

**Email sign-up and links.** People create an account with an email and password (with a confirm-password box). Supabase emails a confirmation link, and the page offers "Resend the email". "Forgot your password?" emails a reset link, and following it opens a "Choose a new password" screen. For those links to bring people back to the app, open **Authentication → URL Configuration** in Supabase and set **Site URL** to `http://localhost:5173` (and add your real address there when you deploy). The default is `http://localhost:3000`, which will not work. Supabase's built-in email sender is rate-limited (a few emails an hour), which is fine for two parents.

Tip: Supabase asks new accounts to confirm their email by default. For a private two-person app you can turn that off under **Authentication → Providers → Email → Confirm email**.

How it is wired: `src/data/supabase/` holds the real implementations of the same interfaces the mock implements, and `DataProvider.tsx` picks them when both env values are set. Photos go to the private bucket and are shown through short-lived signed links.

Not done yet: writes go straight to the server, so there is no offline queue (the `syncStatus` field and `SyncService` are ready for one), places search still uses the local sample list until Google Places is connected, and changes made on one phone appear on the other after a refresh (no realtime).

## The data layer and the Supabase swap

Components and hooks only use the interfaces in `src/data/repositories/` (plus `PlacesService`). ESLint blocks any import of `data/mock` outside `DataProvider.tsx`, so the boundary is enforced.

**Where the swap happens:** `src/data/DataProvider.tsx`, at this line:

```ts
const createDataLayer = isSupabaseConfigured ? createSupabaseDataLayer : createMockDataLayer
```

The Supabase versions already exist. To add another back end, write a function that returns a `DataLayer` (see `src/data/repositories/index.ts`) and point `createDataLayer` at it. These are the interfaces involved:

| Interface              | File                                        | Mock today                                   |
| ---------------------- | ------------------------------------------- | -------------------------------------------- |
| `RestaurantRepository` | `data/repositories/RestaurantRepository.ts` | `MockRestaurantRepository`                   |
| `VisitRepository`      | `.../VisitRepository.ts`                    | `MockVisitRepository`                        |
| `DishRepository`       | `.../DishRepository.ts`                     | `MockDishRepository`                         |
| `WineRepository`       | `.../WineRepository.ts`                     | `MockWineRepository`                         |
| `KidInfoRepository`    | `.../KidInfoRepository.ts`                  | `MockKidInfoRepository`                      |
| `AllergyRepository`    | `.../AllergyRepository.ts`                  | `MockAllergyRepository`                      |
| `WishlistRepository`   | `.../WishlistRepository.ts`                 | `MockWishlistRepository`                     |
| `FamilyRepository`     | `.../FamilyRepository.ts`                   | `MockFamilyRepository`                       |
| `AuthService`          | `.../AuthService.ts`                        | `MockAuthService` (Alex/Sam switcher)        |
| `PhotoStorage`         | `.../PhotoStorage.ts`                       | `MockPhotoStorage` (resized data URLs)       |
| `SyncService`          | `.../SyncService.ts`                        | `MockSyncService` (no-op)                    |
| `PlacesService`        | `services/PlacesService.ts`                 | `MockPlacesService` (swap for Google Places) |

All methods are async, so a network back end fits without changing callers. The optional `devTools` entry on `DataLayer` is mock-only; omit it and the "Sample data" section in Profile disappears.

### Offline-first

Every record has a `syncStatus` (`local` | `pending` | `synced`). Creates and updates are written to local storage first and marked `local`. A real implementation can push `local` records later through `SyncService`. A basic web app manifest is included so the app can be installed to the home screen; there is no service worker yet.

## Allergy and sharing rules

These are rules in code, with tests (`src/lib/allergy.test.ts`):

- Mia's egg allergy is shown as a calm, neutral badge ("Mia: egg"), never a red alarm.
- The app never says a restaurant or dish is "egg-safe". It only shows the family's own dated notes and the prompt "Confirm with the restaurant again."
- The "Safe for Mia" filter (Phase 2) uses only past family notes.
- Share cards contain food info only and can never include allergy notes or details about the children. This is enforced in code (`src/lib/shareCard.ts`), not a setting: a card is built by picking an allowed list of fields one at a time, the card renderer only accepts that type, dishes or wines whose names mention a family member are dropped, and a final check refuses to build a card that mentions anyone in the family or allergies. Tests lock the allowed fields.
- The CSV export leaves out free-text notes and allergy details. The JSON backup includes everything and is labeled as private.

## Sample data

Restaurant names are well-known chains and local spots around Chicago, IL 60601, but **addresses, drive times and tags are approximate placeholders and have not been verified**. They live in `src/services/mock/placesData.ts` and will be replaced by Google Places.
