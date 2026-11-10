# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep the UI thin and data-driven; fetch from the `/api` contract, show loading and empty states, and surface failures as accessible alerts while leaving routing and composition in React Router.
- Logic tier decision: Implement the Express service layer as the source of truth for validation and business rules; keep route handlers thin and delegate CRUD, ranking, and recommendation logic to `octofitService`.
- Data tier decision: Enforce required model fields and seed invariants in Mongoose schemas first so the API and tests operate on consistent documents and valid references.
- Activity tracking approach: Validate `userId` and `teamId` as real Mongo IDs, confirm both records exist, reject malformed or missing references with a deliberate 4xx, then compute `points` from `minutes` and store `occurredAt` in the activity document.
- Team management approach: Require a non-empty `name` and preserve the submitted `mascot` and `members` values; allow team membership updates consistent with seeded user/team relationships without mutating unrelated records.
- Leaderboard approach: Aggregate activity points per team, sort descending by `totalPoints`, and assign a 1-based `rank` to each entry while keeping `teamName` and `totalPoints` in the response payload.
- Workout suggestions approach: Match the requested user's email to a seeded user, infer the priority focus from the user's goal or the most recent activity type, and return a reasoned suggestion set with the first item aligned to that pattern.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — validates Mongoose schema requirements and idempotent seed behavior before API logic is trusted.
- API command: `npm run test:api --prefix octofit-tracker/backend` — confirms route-level inputs, validation, leaderboard ranking, and workout suggestion behavior against the contract.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — verifies the React UI renders seeded/empty/loading/error states and calls the correct `/api` endpoints for each capability.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — catches TypeScript and runtime-contract issues in the Express/Mongoose implementation.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — catches TypeScript and Vite bundle issues in the React presentation layer.

## Verified implementation order

Follow this order to keep the work small and safe:

1. Fix the data layer schema validations and defaults in `octofit-tracker/backend/src/models`.
2. Implement the business logic in `octofit-tracker/backend/src/services/octofitService.ts` for activities, teams, leaderboard, and workout recommendations.
3. Confirm the API contract in `octofit-tracker/backend/src/routes/api.ts` returns the expected statuses and payload shapes.
4. Finish the presentation layer in `octofit-tracker/frontend/src` by fetching real API data and replacing placeholder cards with loading, empty, and error states.

This order matches the current failing test stack: data contract failures first, then API contract failures, and finally frontend rendering failures.
