# TrackerX Nutrition Tracker: Specification

## 0 About this document

### 0.1 Purpose

This document specifies the TrackerX platform and its Nutrition Tracker app.
Use this document to make a new copy of the system that operates the same way.

### 0.2 Writing standard

This document uses Simplified Technical English (STE), as in ASD-STE100.
The rules that follow apply:

- Each sentence has one topic.
- Procedural sentences have a maximum of 20 words.
- Descriptive sentences have a maximum of 25 words.
- Instructions use the imperative.
- The word "must" identifies a requirement.
- The word "can" identifies a permitted condition.
- Names of files, tables, columns, routes, variables and values are technical names. They are in `code` format.

### 0.3 Requirement identifiers

Each requirement has an identifier, for example `DB-001`.
Use the identifiers to trace tests to requirements.

| Prefix | Subject                     |
| ------ | --------------------------- |
| `REPO` | Repository and tools        |
| `DB`   | Database                    |
| `ENV`  | Configuration               |
| `AUTH` | Authentication and sessions |
| `CALC` | Calculations                |
| `VIS`  | Vision analysis             |
| `STO`  | Photo storage               |
| `API`  | HTTP routes                 |
| `ACT`  | Server actions              |
| `DSK`  | Desktop dashboard           |
| `MOB`  | Phone app                   |
| `ADM`  | Administration tools        |
| `SEC`  | Security                    |
| `OPS`  | Build, run and deploy       |
| `TST`  | Tests                       |

---

## 1 System overview

### 1.1 Function

The Nutrition Tracker records what a person eats and drinks. It also records workouts and body weight.
A person can photograph a meal. A vision model then estimates the food name and the macronutrients.
The person examines the estimate, corrects it if necessary, and saves it.
The system calculates calories from the macronutrients. It does not keep calories that a person enters.
The system compares each day with the daily targets of the person.
The system estimates the date when the person gets to the goal weight.

### 1.2 Parts

The system has these parts:

1. A desktop dashboard at route `/`.
2. A phone web app at route `/m`. It operates as an installable web app on iPhone.
3. An HTTP API for health, data version, photo upload access and vision analysis.
4. One PostgreSQL database. Each app on the platform has its own schema.
5. An object store for meal photos. This is a local directory or a Supabase Storage bucket.
6. A vision model server that is compatible with the OpenAI chat completions API. Ollama is the default.

### 1.3 Operation modes

The system has two authentication modes. The variable `AUTH_MODE` sets the mode.

| Mode       | Use                           | Identity                                                        |
| ---------- | ----------------------------- | --------------------------------------------------------------- |
| `mock`     | Local network and development | A person selects a name. There is no password.                  |
| `supabase` | Cloud deployment              | Supabase Auth email one-time code. A JWT identifies the person. |

Many functions exist only in `mock` mode. These are the sessions panel, groups, the settings page and people management.

### 1.4 Technology

The system must use these technologies, or equivalents with the same behavior:

| Area             | Technology                                  | Version     |
| ---------------- | ------------------------------------------- | ----------- |
| Runtime          | Node.js                                     | 26 or later |
| Package manager  | pnpm                                        | 12.16.1     |
| Monorepo         | Turborepo                                   | 2.11        |
| Web framework    | Next.js, App Router, `output: "standalone"` | 16.4.5      |
| UI               | React                                       | 19.2        |
| Styles           | Tailwind CSS                                | 4.3         |
| Icons            | `lucide-react`                              | 1.68        |
| Font             | `geist`                                     | 1.9         |
| Validation       | `zod`                                       | 4.6         |
| Database driver  | `postgres` (postgres.js)                    | 4.0         |
| JWT              | `jose`                                      | 6.2         |
| Image processing | `sharp`                                     | 0.35        |
| Tests            | Vitest                                      | 5.1         |
| Lint             | ESLint with `eslint-config-next`            | 9.39        |
| Language         | TypeScript, strict                          | 5.9         |
| Database         | PostgreSQL                                  | 17          |
| Containers       | Podman or Docker, with compose              | Any current |

---

## 2 Repository

### 2.1 Layout

`REPO-001` The repository must have this layout:

```
/
├── apps/nutrition-tracker/      Next.js app
│   ├── src/app/                 Routes, pages, server actions
│   ├── src/components/          React components (desktop and mobile/)
│   ├── src/lib/                 Server and shared logic
│   ├── src/proxy.ts             Next.js request proxy (token refresh)
│   ├── Dockerfile
│   └── .env.example
├── packages/ui/                 Shared design system (@trackerx/ui)
├── supabase/migrations/         SQL migrations, in time order
├── supabase/seed.sql            Demo data, local only
├── infra/local/initdb/          Local database start scripts
├── infra/gcp/cloudbuild.yaml    Cloud Build pipeline
├── scripts/                     Shell scripts for the stack
├── compose.yaml
├── turbo.json
├── pnpm-workspace.yaml          Workspaces: apps/*, packages/*
├── tsconfig.base.json
└── .nvmrc                       Contains: 26
```

`REPO-002` The root `package.json` must have these scripts:

| Script        | Command                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `dev`         | `turbo run dev`                                                        |
| `build`       | `turbo run build`                                                      |
| `lint`        | `turbo run lint`                                                       |
| `typecheck`   | `turbo run typecheck`                                                  |
| `test`        | `turbo run test`                                                       |
| `db:up`       | `./scripts/compose.sh up -d --wait db`                                 |
| `db:down`     | `./scripts/compose.sh down`                                            |
| `db:reset`    | `./scripts/compose.sh down -v && ./scripts/compose.sh up -d --wait db` |
| `stack:up`    | `./scripts/build-image.sh && ./scripts/compose.sh up -d --wait`        |
| `stack:phone` | `./scripts/stack-phone.sh`                                             |
| `stack:down`  | `./scripts/compose.sh down`                                            |

`REPO-003` In `turbo.json`, the `build` task must depend on `^build` and `typecheck`. Its outputs are `.next/**`, but not `.next/cache/**`.

`REPO-004` The `dev` task must not use the cache. It must be persistent.

`REPO-005` The app `package.json` must have these scripts: `dev`, `build`, `start`, `lint` (`eslint .`), `typecheck` (`next typegen && tsc --noEmit`) and `test` (`vitest run`).

`REPO-006` The app must use the path alias `@/` for `src/`.

### 2.2 Shared design system

`REPO-010` The package `@trackerx/ui` must export these components: `StatusLabel`, `Button`, `buttonClasses`, `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle`, `cn`, `Dialog`, `Dropzone`, `Field`, `Input`, `Select`, `Textarea`, `KpiCard` and `ProgressBar`.

`REPO-011` `Next.js` must transpile `@trackerx/ui` (`transpilePackages`).

`REPO-012` `KpiCard` must show a label, a value, a unit, a caption, an optional status label and an optional progress bar. A progress tone is `default` or `warning`. A status tone is `good`, `warning` or `critical`.

`REPO-013` `Dropzone` must accept a file by drop, by click and, when enabled, by paste. It must refuse a file with a type or size that is not permitted, and report the reason.

---

## 3 Database

### 3.1 General rules

`DB-001` Each app must own one schema with the name `app_<name>`. The Nutrition Tracker uses `app_nutrition`.

`DB-002` Each user table must reference `auth.users (id)` with `on delete cascade`.

`DB-003` Row level security (RLS) must be on for every table in `app_nutrition`.

`DB-004` For user-owned tables, give the role `authenticated` select, insert, update and delete policies. Each policy must compare `user_id` with `(select auth.uid())`.

`DB-005` Server-only tables must have RLS on, with no policies and no grants. Only the server role can use them.

`DB-006` Give `service_role` all privileges on the tables in `app_nutrition`.

`DB-007` Revoke all privileges on schema `app_nutrition` from `public`. Grant usage to `authenticated` and `service_role`.

`DB-008` Apply migrations in file-name order. A migration must not change after it is applied. Make a new migration for each change.

### 3.2 Local Supabase shim

`DB-010` For local PostgreSQL, a shim script must make the Supabase objects that the migrations need. Do not apply this shim to Supabase.

The shim must make these objects:

1. Roles `anon` and `authenticated` (`nologin noinherit`).
2. Role `service_role` (`nologin noinherit bypassrls`).
3. Schema `auth`.
4. Table `auth.users`: `id uuid primary key default gen_random_uuid()`, `email text unique`, `created_at timestamptz not null default now()`.
5. Function `auth.uid()`. It returns the `sub` value as `uuid`. It reads `request.jwt.claim.sub` first. If that is empty, it reads `sub` from the JSON in `request.jwt.claims`.
6. Grants of usage on `auth` and execute on `auth.uid()` to the three roles.

`DB-011` On the first start of the local database, a script must apply all migrations in order, then `seed.sql`. Each `psql` call must use `ON_ERROR_STOP=1`.

### 3.3 Tables

All tables are in schema `app_nutrition`, except where the text gives a different schema.

#### 3.3.1 `user_profiles`

One row for each person.

| Column              | Type           | Rules                                                            |
| ------------------- | -------------- | ---------------------------------------------------------------- |
| `user_id`           | `uuid`         | Primary key. References `auth.users`.                            |
| `display_name`      | `text`         | Nullable. Length 1 to 40. Unique index on `lower(display_name)`. |
| `target_calories`   | `integer`      | Not null. Default 2000. Range 800 to 10000.                      |
| `target_protein_g`  | `integer`      | Not null. Default 130. Range 0 to 1000.                          |
| `target_carbs_g`    | `integer`      | Not null. Default 220. Range 0 to 2000.                          |
| `target_fat_g`      | `integer`      | Not null. Default 65. Range 0 to 1000.                           |
| `target_glasses`    | `integer`      | Not null. Default 8. Range 1 to 50.                              |
| `current_weight_kg` | `numeric(5,2)` | Nullable. Range 20 to 500.                                       |
| `goal_weight_kg`    | `numeric(5,2)` | Nullable. Range 20 to 500.                                       |
| `timezone`          | `text`         | Not null. Default `'UTC'`. An IANA zone name.                    |
| `created_at`        | `timestamptz`  | Not null. Default `now()`.                                       |
| `updated_at`        | `timestamptz`  | Not null. Default `now()`.                                       |

`DB-020` A `before update` trigger must set `updated_at` to `now()`. The trigger function must use `set search_path = ''`.

`DB-021` Policies: select, insert and update for the owner. There is no delete policy. Grant select, insert and update to `authenticated`.

#### 3.3.2 `food_logs`

One row for each meal.

| Column       | Type           | Rules                                     |
| ------------ | -------------- | ----------------------------------------- |
| `id`         | `uuid`         | Primary key. Default `gen_random_uuid()`. |
| `user_id`    | `uuid`         | Not null. References `auth.users`.        |
| `image_url`  | `text`         | Nullable.                                 |
| `food_name`  | `text`         | Not null. Length 1 to 200.                |
| `protein_g`  | `numeric(6,1)` | Not null. Range 0 to 2000.                |
| `carbs_g`    | `numeric(6,1)` | Not null. Range 0 to 2000.                |
| `fat_g`      | `numeric(6,1)` | Not null. Range 0 to 2000.                |
| `calories`   | `integer`      | Generated, stored. See `CALC-001`.        |
| `notes`      | `text`         | Nullable. Maximum length 2000.            |
| `logged_at`  | `timestamptz`  | Not null. Default `now()`.                |
| `created_at` | `timestamptz`  | Not null. Default `now()`.                |

`DB-030` `calories` must be `generated always as (round(protein_g * 4 + carbs_g * 4 + fat_g * 9)::integer) stored`.

`DB-031` Make an index on `(user_id, logged_at desc)`.

`DB-032` Policies: select, insert, update and delete for the owner.

#### 3.3.3 `weight_logs`

One weight for each person for each day.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null. References `auth.users`. |
| `logged_on` | `date` | Not null. |
| `weight_kg` | `numeric(5,2)` | Not null. Range 20 to 500. |
| `created_at` | `timestamptz` | Not null. Default `now()`. |

`DB-040` Make a unique constraint on `(user_id, logged_on)`. A second entry for the same day replaces the first.

`DB-041` Policies: select, insert, update and delete for the owner.

#### 3.3.4 `workouts`

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null. References `auth.users`. |
| `worked_out_on` | `date` | Not null. |
| `workout_type` | `text` | Not null. Length 1 to 60. |
| `duration_minutes` | `integer` | Not null. Range 1 to 1440. |
| `calories_burned` | `integer` | Not null. Range 0 to 10000. The value comes from a watch or fitness app. |
| `created_at` | `timestamptz` | Not null. Default `now()`. |

`DB-050` Make an index on `(user_id, worked_out_on desc)`.

`DB-051` Policies: select, insert, update and delete for the owner.

#### 3.3.5 `drink_logs`

The number of glasses for each person, day and drink type. Drinks have no calories.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null. References `auth.users`. |
| `drunk_on` | `date` | Not null. |
| `drink_type` | `text` | Not null. One of `water`, `coffee`, `tea`, `other`. |
| `glasses` | `integer` | Not null. Range 1 to 50. |
| `created_at` | `timestamptz` | Not null. Default `now()`. |

`DB-060` Make a unique constraint on `(user_id, drunk_on, drink_type)`.

`DB-061` Policies: select, insert, update and delete for the owner.

#### 3.3.6 `device_sessions` (server only, `mock` mode)

One session is one person on one device.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `user_id` | `uuid` | Not null. References `auth.users`. |
| `device_id` | `uuid` | Nullable. |
| `device_label` | `text` | Not null. Length 1 to 100. |
| `created_at` | `timestamptz` | Not null. Default `now()`. |
| `last_seen_at` | `timestamptz` | Not null. Default `now()`. |
| `ended_at` | `timestamptz` | Nullable. Null means the session is open. |

`DB-070` Make an index on `last_seen_at desc`.

`DB-071` Make a unique index on `(user_id, device_id)`.

#### 3.3.7 `session_groups` and `person_groups` (server only, `mock` mode)

`session_groups`: `id uuid` primary key, `name text` not null with length 1 to 40, `created_at timestamptz`. Make a unique index on `lower(name)`.

`person_groups`: `user_id uuid` primary key that references `auth.users` with cascade, and `group_id uuid` not null that references `session_groups (id)` with cascade. Make an index on `group_id`.

`DB-080` A person can be in a maximum of one group.

`DB-081` When a group is deleted, its people become ungrouped. Their data does not change.

#### 3.3.8 `app_settings` (server only, `mock` mode)

`key text` primary key, `value text` not null, `updated_at timestamptz` not null default `now()`.

`DB-090` These keys are permitted: `vision.provider`, `vision.base_url`, `vision.model`, `vision.api_key`.

### 3.4 Seed data

`DB-100` `seed.sql` must make the demo user. Use id `00000000-0000-4000-8000-000000000001` and email `demo@trackerx.local`.

`DB-101` The demo profile must have: display name `Demo User`, targets 2100 kcal, 150 g protein, 220 g carbs and 70 g fat. Current weight is 84.5 kg. Goal weight is 78.0 kg. Timezone is `UTC`.

`DB-102` Add three meals on each of the seven previous days. The meals are at 08:00, 13:00 and 19:00:

| Meal | Protein g | Carbs g | Fat g |
| --- | --- | --- | --- |
| Greek Yogurt with Berries | 24 | 38 | 8 |
| Chicken Burrito Bowl | 46 | 72 | 21 |
| Grilled Salmon with Quinoa | 45 | 40 | 23 |

Add `(day_offset * 3) % 10` to the carbs of each meal.

`DB-103` Add one meal today, at `now()`: Oatmeal with Banana, 14 g protein, 72 g carbs, 8 g fat.

`DB-104` Add a weight for each of the days 0 to 7 before today. The value is `84.5 + day_offset * 0.15`.

`DB-105` Each insert in the seed must use `on conflict do nothing` where a key can conflict.

---

## 4 Configuration

`ENV-001` The server must read and validate the environment with a `zod` schema. It must do this lazily, at first use, so that `next build` does not need runtime values.

`ENV-002` The server must cache the parsed result.

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | `development`, `test`, `production` | `development` | |
| `DATABASE_URL` | string | Required | PostgreSQL connection string. |
| `DATABASE_POOL_MAX` | positive integer | 5 | Maximum pool connections. |
| `AUTH_MODE` | `mock`, `supabase` | Required | |
| `ALLOW_MOCK_AUTH` | `true`, `false` | `false` | Permits `mock` in production. |
| `MOCK_USER_ID` | uuid | `00000000-0000-4000-8000-000000000001` | The default person in `mock` mode. |
| `SUPABASE_URL` | URL | None | |
| `SUPABASE_ANON_KEY` | string | None | |
| `SUPABASE_JWT_SECRET` | string | None | Only for the legacy shared secret. |
| `SUPABASE_SERVICE_ROLE_KEY` | string | None | For Supabase Storage. |
| `STORAGE_DRIVER` | `local`, `supabase` | `local` | |
| `STORAGE_BUCKET` | string | `nutrition-uploads` | |
| `UPLOAD_DIR` | string | `.data/uploads` | |
| `ENABLE_DB_VIEWER` | `true`, `false` | `false` | |
| `VISION_PROVIDER` | `mock`, `openai` | `mock` | |
| `VISION_BASE_URL` | URL | `http://localhost:11434/v1` | |
| `VISION_MODEL` | string | `qwen3.5:9b` | |
| `VISION_API_KEY` | string | None | |
| `VISION_TIMEOUT_MS` | positive integer | 120000 | |
| `VISION_MAX_IMAGE_PX` | positive integer | 512 | Longest edge sent to the model. |
| `MOCK_VISION_LATENCY_MS` | integer, 0 or more | 1000 | |
| `VISION_ALLOWED_IMAGE_HOSTS` | comma list | empty | Trimmed, lowercase, empty items removed. |

`ENV-003` The validation must fail when `AUTH_MODE=mock`, `NODE_ENV=production` and `ALLOW_MOCK_AUTH` is not `true`.

`ENV-004` The validation must fail when `AUTH_MODE=supabase` and `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing.

`ENV-005` The validation must fail when `STORAGE_DRIVER=supabase` and `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing.

`ENV-006` Supply `apps/nutrition-tracker/.env.example` with local values for all variables. Set `VISION_PROVIDER=openai` and `ENABLE_DB_VIEWER=true` in this file.

---

## 5 Data access

`DB-200` Keep one connection pool on `globalThis`. This prevents pool leaks during development reloads.

`DB-201` Pool settings: `max` from `DATABASE_POOL_MAX`, `idle_timeout` 20 s, `connect_timeout` 10 s, and `prepare: false`. The Supabase transaction pooler does not support prepared statements.

`DB-202` All user data access must use the function `withUser(userId, work)`. This function must do these steps in one transaction:

1. Set `request.jwt.claims` to `{"sub": userId, "role": "authenticated"}`, local to the transaction.
2. Run `set local role authenticated`.
3. Run `work`.

`DB-203` Server-only queries (sessions, groups, settings, people) can use the pool directly. Use them only in `mock` mode.

`DB-204` Before each profile read, insert a profile row for the user with `on conflict do nothing`. A new user thus always has a profile with default targets.

`DB-205` The server must compute "today" in the timezone of the person, with PostgreSQL `now() at time zone <zone>`. Format dates as `YYYY-MM-DD`.

`DB-206` The server must check a timezone against `pg_timezone_names` before it saves it.

---

## 6 Authentication and sessions

### 6.1 Current user

`AUTH-001` In `mock` mode, the current user comes from cookie `m-session`:

- If there is no cookie, the user is `MOCK_USER_ID`.
- If the cookie identifies an open session, the user is the owner of that session.
- If the cookie identifies an ended or deleted session, there is no user. Do not use `MOCK_USER_ID` in this condition.

`AUTH-002` In `supabase` mode, get the token from the `Authorization: Bearer` header. If there is no header, get it from cookie `sb-access-token`.

`AUTH-003` Verify a Supabase token with issuer `<SUPABASE_URL>/auth/v1` and audience `authenticated`. If `SUPABASE_JWT_SECRET` is set, use HS256 with that secret. If not, use the JWKS at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`. Cache one JWKS for each URL.

`AUTH-004` The token `sub` must be a uuid. If it is not, there is no user.

### 6.2 Acting user

`AUTH-010` A server action can receive an `asUserId` value. In `mock` mode, the action applies to that person, if the person exists. In `supabase` mode, the action must ignore `asUserId` and use the current user.

`AUTH-011` The vision route receives `asUserId` in the request header `x-act-as`.

### 6.3 Supabase sign-in

`AUTH-020` The route `/login` must show a two-step form: email, then code.

`AUTH-021` Step 1: validate the email (maximum 320 characters). Send `POST <SUPABASE_URL>/auth/v1/otp` with `{email, create_user: true}`. On status 429, show "Too many attempts. Wait a minute and try again."

`AUTH-022` Step 2: the code must be 6 to 10 digits. Send `POST /auth/v1/verify` with `{type: "email", email, token}`. On success, set the cookies and go to `/`. On failure, show "That code is wrong or has expired."

`AUTH-023` Cookies: `sb-access-token` with `maxAge` equal to `expires_in`, and `sb-refresh-token` with `maxAge` of 30 days. Both are `httpOnly`, `sameSite=lax`, `path=/`. They are `secure` in production.

`AUTH-024` Sign-out: send `POST /auth/v1/logout` with the access token. Delete both cookies even if the request fails. Then go to `/login`.

`AUTH-025` The request proxy (`src/proxy.ts`) must refresh tokens in `supabase` mode. Refresh when the access token is missing, cannot be decoded, has no `exp`, or expires in less than 60 s.

`AUTH-026` To refresh, send `POST /auth/v1/token?grant_type=refresh_token`. Then do one of these steps:

- On status 400 or 401, delete both cookies from the request and the response.
- On a different error or a network failure, continue with no change.
- On success, set the new cookies on the request and on the response.

`AUTH-027` The proxy must not operate on `_next/static`, `_next/image` or `icon.svg`.

### 6.4 Phone sessions (`mock` mode)

`AUTH-030` Cookies for phone sessions:

| Cookie | Content |
| --- | --- |
| `m-session` | Session id. |
| `m-device` | Device id, a uuid that the server makes at the first sign-in. |
| `m-last-person` | User id of the last person on this device. |

All three cookies are `httpOnly`, `sameSite=lax`, `path=/`, `secure=false` and `maxAge` of 365 days. The phone app uses plain HTTP on the local network.

`AUTH-031` The device label comes from the user agent. The format is "`<device>`, `<browser>`", for example "iPhone, Safari".

- Device: iPhone, iPad, Android, Mac, Windows, or "Unknown device".
- Browser: Chrome (`CriOS` or `Chrome`), Firefox (`FxiOS` or `Firefox`), Safari. Test in this order.
- If there is no browser match, show only the device.

`AUTH-032` To open a session for a person on a device, do these steps in one transaction:

1. Find a row for the user with the same `device_id`. If none, find a row with no `device_id` and the same label. Prefer a row with a `device_id`, then the most recent `last_seen_at`. Lock the row.
2. If a row exists, set `device_id`, `device_label`, `ended_at = null` and `last_seen_at = now()`.
3. If not, insert a row. On conflict of `(user_id, device_id)`, set `ended_at = null` and `last_seen_at = now()`.

`AUTH-033` "Add person" must find a person with the same name, case-insensitive. If none exists, insert a row in `auth.users` and a profile with that name. Use the browser timezone if PostgreSQL knows it. If not, use `UTC`.

`AUTH-034` To resolve a session, find an open row with that id. If `last_seen_at` is more than 30 s old, set it to `now()`.

`AUTH-035` "Switch Person" must save the user in `m-last-person`, set `ended_at` on the session, delete `m-session`, and go to `/m/sign-in`.

`AUTH-036` Each phone page must require a user. In `mock` mode with no open session, go to `/m/sign-in`. In `supabase` mode with no user, go to `/login`.

---

## 7 Calculations

All calculations are pure functions. Write unit tests for each.

### 7.1 Calories

`CALC-001` Calories = round(protein × 4 + carbs × 4 + fat × 9). The database column and the client display must use the same formula.

### 7.2 Day goal score

`CALC-010` Net calories for a day = calories eaten − calories burned in workouts on that day.

`CALC-011` Goal score = max(25, round((1 − |net − target| / target) × 100)). Eating over the target has the same cost as eating under it.

`CALC-012` A day with no meals has no goal score.

`CALC-013` Show the score with a trophy icon. The hue is 45 + ((score − 25) / 75) × 90, in `hsl(<hue> 85% 38%)`. Fill the trophy when the score is 90 or more.

### 7.3 Goal weight projection

Constants: 7700 kcal for each kg of body weight. Maintenance is 30 kcal for each kg of current weight. The minimum is 3 logged days. The maximum is 3650 days. The tolerance is 0.1 kg.

`CALC-020` Input: current weight, goal weight, the net calories of each complete logged day in the 7 days before today, and today.

`CALC-021` Use this logic, in this order:

1. If a weight is missing, the status is `needs_profile`. Message: "Add your current weight and goal weight to see a projection."
2. If |goal − current| < 0.1 kg, the status is `reached`.
3. If there are fewer than 3 days, the status is `needs_data`. Message: "Log N more full day(s) to see a projection."
4. Calculate average = mean of the day values. Calculate maintenance = current × 30. Calculate surplus = average − maintenance.
5. If the person must lose weight and surplus ≥ 0, the status is `off_track`. If the person must gain weight and surplus ≤ 0, the status is `off_track`.
6. Calculate days = ceil(|goal − current| × 7700 / |surplus|).
7. If days > 3650, the status is `off_track` with the text "more than 10 years away".
8. If not, the status is `on_track`. Give the target date (today + days, "long" date style), the days remaining, and a message.

### 7.4 Recommended targets

Constants: deficit 500 kcal, surplus 300 kcal, minimum 1200 kcal, protein 1.8 g for each kg of goal weight, fat 25 % of calories.

`CALC-030` Return nothing if a weight is not in the range 20 to 500 kg.

`CALC-031` Use this logic:

1. Maintenance = current × 30.
2. If |goal − current| < 0.1, calories = maintenance. If the goal is lower, calories = maintenance − 500. If the goal is higher, calories = maintenance + 300.
3. Calories = max(calories, 1200), rounded to the nearest 10.
4. Protein = goal × 1.8, rounded to the nearest 5.
5. Fat = calories × 0.25 / 9, rounded to the nearest 5.
6. Carbs = max(0, (calories − protein × 4 − fat × 9) / 4, rounded to the nearest 5).

Examples: current 70 and goal 75 give 2400 kcal. Current 80 and goal 80 give 2400 kcal. Current 50 and goal 40 give 1200 kcal.

### 7.5 Manual meal

`CALC-040` A manual meal has a name, a quantity, and protein, carbs and fat for one serving. The quantity step is 0.5.

`CALC-041` Read a decimal comma as a decimal point. iPhone keypads in many regions type a comma.

`CALC-042` Blank macros are zero. If the sum of the macros is not more than zero, the meal is not valid.

`CALC-043` The saved values are each macro × quantity, rounded to 0.1. If the quantity is not 1, the saved name is "`<name>` × `<quantity>`".

### 7.6 Grouping by day

`CALC-050` Group meals by the local day of the person. Keep the newest-first order.

`CALC-051` Each group has: day, label, calories, protein, carbs, fat (rounded to 0.1), burned, goal score, and meals with a local time (for example "8:05 AM").

`CALC-052` Day label: "Today", "Yesterday", or a short date such as "Mon, Nov 3".

### 7.7 Drinks

`CALC-060` Drink types and labels: `water` Water, `coffee` Coffee, `tea` Tea, `other` Other. The maximum is 50 glasses.

`CALC-061` The editable list must show the 7 days to today, also with no drinks, and all older logged days. Show the newest first.

`CALC-062` Summary text for a day, for example "2 water, 1 coffee". Show only the types with a value more than zero.

`CALC-063` Glass label: "1 glass" or "N glasses".

### 7.8 History

`CALC-070` A month summary counts the days with meals. The average calories uses only those days.

`CALC-071` A month key must match `^\d{4}-(0[1-9]|1[0-2])$`.

### 7.9 Charts

`CALC-080` All series in one chart use one scale. Include the reference line value in the range. For counts, include zero.

`CALC-081` The tick step is a "nice" value (1, 2, 5 or 10 × a power of 10), near range / 3. The range is a minimum of 2 % of the maximum value, and a minimum of 0.5.

`CALC-082` Map the x position linearly from the first day to the last day. If there is only one day, put it at the center.

`CALC-083` On hover or tap, show the value of the point with the nearest x position.

### 7.10 Session status

`CALC-090` A session status is `ended` if `ended_at` is set. It is `active` if it was used less than 5 minutes ago. If not, it is `inactive`.

`CALC-091` Duration = (`ended_at` or `last_seen_at`) − `created_at`, with a minimum of zero. Show it as "Under 1 min", "N min", "N h M min", or "N d M h".

`CALC-092` Group summary text, for example "3 users, 1 active". Count people, not sessions.

---

## 8 Vision analysis

### 8.1 Contract

`VIS-001` The only task is `NUTRITION`. The design must permit more tasks later.

`VIS-002` A nutrition result has: `foodName` (1 to 200 characters), `calories` (integer, 0 or more), `proteinG`, `carbsG`, `fatG` (0 or more), and `confidence` (0 to 1).

`VIS-003` A success response is `{ok: true, requestId, model, imageUrl, analysis: {task, result}}`.

`VIS-004` An error response is `{ok: false, requestId, error: {code, message}}`.

`VIS-005` `requestId` is a new uuid for each request.

`VIS-006` The maximum image size is 8 MB. Accepted types are JPEG, PNG and WebP.

### 8.2 Provider interface

`VIS-010` A provider has a `model` name and a function `analyze(task, input, signal)`. The input is bytes with a MIME type, or a URL.

`VIS-011` When the image does not show food, the provider must throw `ImageNotRecognizedError`.

`VIS-012` Get the provider settings from `app_settings` first, then from the environment. In `supabase` mode, use only the environment.

### 8.3 OpenAI-compatible provider

`VIS-020` Before the server sends bytes to the model, it must do these steps with `sharp`:

1. Apply the EXIF orientation (`rotate()`).
2. Resize to fit in `VISION_MAX_IMAGE_PX` × `VISION_MAX_IMAGE_PX`. Do not enlarge.
3. Encode as JPEG, quality 80.
4. Send it as a `data:image/jpeg;base64,` URL.

If `sharp` cannot decode the image, throw `ImageNotRecognizedError`.

`VIS-021` Send `POST <baseUrl>/chat/completions` with this body:

- `model`
- `temperature: 0`
- `reasoning_effort: "none"`
- `response_format` of type `json_schema`, with `strict: true` and the name `nutrition`
- One user message with a text part and an `image_url` part.

`VIS-022` If an API key is set, send `Authorization: Bearer <key>`.

`VIS-023` The prompt must be: "You are a nutrition analyst. Identify the meal in the photo and estimate the total for everything visible, judging portion size from the plate and surroundings. Give the total grams of protein, carbs, and fat. Set isFood to false, with zero values, if the photo does not show food. confidence is 0 to 1."

`VIS-024` The JSON schema requires these properties and no others: `isFood` (boolean), `foodName` (string), `proteinG`, `carbsG`, `fatG`, `confidence` (number).

`VIS-025` If `isFood` is false, throw `ImageNotRecognizedError`.

`VIS-026` Calculate `calories` with `CALC-001`. Do not use a calorie value from the model.

`VIS-027` Stop the request after `VISION_TIMEOUT_MS`, or when the client cancels.

### 8.4 Mock provider

`VIS-030` The mock provider must wait `MOCK_VISION_LATENCY_MS`. It must stop if the request is cancelled.

`VIS-031` It must calculate the SHA-256 of the bytes or the URL. The first 4 bytes, as an unsigned big-endian integer, modulo 6, select one plate:

| Plate | kcal | Protein | Carbs | Fat |
| --- | --- | --- | --- | --- |
| Grilled Salmon with Quinoa | 550 | 45 | 40 | 23 |
| Chicken Burrito Bowl | 680 | 46 | 72 | 21 |
| Avocado Toast with Poached Egg | 420 | 17 | 34 | 25 |
| Beef Stir-Fry with Rice | 640 | 38 | 74 | 20 |
| Greek Salad with Feta | 340 | 12 | 16 | 26 |
| Tofu Poke Bowl | 510 | 24 | 66 | 16 |

`VIS-032` Confidence = 0.82 + (byte 4 modulo 16) / 100. The model name is `mock-vllm-vision-v1`.

### 8.5 Image checks

`VIS-040` Identify the image type from its first bytes. Do not trust the type that the client sends.

- JPEG: `FF D8 FF`.
- PNG: `89 50 4E 47 0D 0A 1A 0A`.
- WebP: `RIFF` at byte 0 and `WEBP` at byte 8.

`VIS-041` An image URL is permitted only if all these conditions are true:

- The protocol is `https:`.
- There is no user name or password.
- The port is empty or 443.
- The host name, in lowercase, is in `VISION_ALLOWED_IMAGE_HOSTS`. It must be an exact match.

---

## 9 Photo storage

`STO-001` The storage interface has `put(key, bytes, contentType)`, `get(key)` and `delete(key)`. `get` returns null for a missing object.

`STO-002` The local driver writes files under `UPLOAD_DIR`. It makes the directories when necessary.

`STO-003` The Supabase driver uses `<SUPABASE_URL>/storage/v1/object`, with the service role key in `Authorization` and `apikey`.

- `put`: `POST /<bucket>/<key>`.
- `get`: `GET /authenticated/<bucket>/<key>`. Status 400 or 404 means missing.
- `delete`: `DELETE /<bucket>/<key>`. Status 400 or 404 is not an error.

`STO-004` A key has the format `<ownerUserId>/<uuid>.<jpg|png|webp>`. Both ids are lowercase uuids. Refuse all other formats. This prevents path traversal.

`STO-005` The public URL of a key is `/api/uploads/<key>`.

`STO-006` When the server deletes a meal, it must delete the photo of that meal if the user owns it. A failure to delete a file must not cause the action to fail. Write the failure to the log.

`STO-007` When a meal is copied, the server must copy its photo to a new key for the target user. Each meal then has its own file.

---

## 10 HTTP routes

All routes use the Node.js runtime and are dynamic.

### 10.1 `GET /api/health`

`API-001` Run `select 1`. On success, return `{"status": "ok"}`. On failure, return status 503 with `{"status": "unavailable"}`.

### 10.2 `GET /api/dashboard/version`

`API-010` Return `{"version": "<string>"}` with `Cache-Control: no-store`.

`API-011` The version is an MD5 of these items: all meals of the last 30 days, all profile `updated_at` values, all weights, all workouts, and all drinks. RLS controls which rows are included.

`API-012` In `mock` mode, include all people. Also add a sessions version. The sessions version contains the session count, the ended count, the latest `last_seen_at`, an MD5 of the groups and an MD5 of the group members.

`API-013` In `supabase` mode with no user, return status 401.

### 10.3 `GET /api/uploads/[...key]`

`API-020` In `supabase` mode with no user, return status 401.

`API-021` If the key is not valid, return status 404. If the user does not own the file, return status 404, except in `mock` mode. Do not confirm that a file of a different user exists.

`API-022` Return the bytes with these headers:

- `Content-Type` from the key extension.
- `Cache-Control: private, max-age=31536000, immutable`.
- `Content-Security-Policy: default-src 'none'`.

### 10.4 `POST /api/vision/analyze`

`API-030` The request is `multipart/form-data` with `task` and one of `image` or `imageUrl`. It can also be `application/json` with `task` and `imageUrl`.

`API-031` Do the checks in this order. Each failure returns its status and code:

| Condition | Status | Code |
| --- | --- | --- |
| No acting user | 401 | `UNAUTHENTICATED` |
| Content type not multipart or JSON | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Multipart with no `Content-Length` | 411 | `LENGTH_REQUIRED` |
| `Content-Length` > 8 MB + 64 KB | 413 | `IMAGE_TOO_LARGE` |
| Body is not valid multipart or JSON | 400 | `INVALID_REQUEST` |
| `task` missing or not supported | 400 | `INVALID_REQUEST` |
| Not exactly one of `image` and `imageUrl` | 400 | `INVALID_REQUEST` |
| URL not permitted (`VIS-041`) | 422 | `IMAGE_HOST_NOT_ALLOWED` |
| File > 8 MB | 413 | `IMAGE_TOO_LARGE` |
| Signature not JPEG, PNG or WebP | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Provider throws `ImageNotRecognizedError` | 422 | `IMAGE_NOT_RECOGNIZED` |
| A different provider error | 502 | `INFERENCE_FAILED` |

`API-032` Do the multipart size check before you read the body.

`API-033` Validate the provider output against the contract before you return it. Model output is not trusted.

`API-034` After a successful analysis of an uploaded file, save the file with a new key. Return its `/api/uploads/` URL as `imageUrl`. For a URL input, return the same URL.

`API-035` Write an `INFERENCE_FAILED` error to the log with the request id, but not if the client cancelled the request.

`API-036` All responses must have `Cache-Control: no-store`.

`API-037` The error messages are:

- `IMAGE_NOT_RECOGNIZED`: "That photo doesn't look like food."
- `INFERENCE_FAILED`: "The image couldn't be analyzed."
- `IMAGE_TOO_LARGE`: "Image exceeds the 8 MB limit."
- `UNSUPPORTED_MEDIA_TYPE` (file): "Image must be a JPEG, PNG, or WebP."

### 10.5 Web app manifest

`API-040` `/manifest.webmanifest` must have: name "Nutrition Tracker", short name "Nutrition", `start_url` and `scope` `/m`, display `standalone`, background and theme color `#f2f2f7`. Icons are `/icon.svg` (any size) and `/apple-icon.png` (180 × 180).

---

## 11 Server actions

### 11.1 General rules

`ACT-001` Each action must find the acting user first. If there is no user, return an error with a "Sign in to …" message.

`ACT-002` Each action must validate its input with `zod`. On failure, return an error message. Do not throw an error.

`ACT-003` After a change, each action must revalidate the layout at `/`.

`ACT-004` Actions return `{status: "saved"}` (or `"done"`) or `{status: "error", message}`.

`ACT-005` An action that receives a day must refuse a day after the local today of the person. Message: "Pick today or an earlier day."

### 11.2 Meal actions

`ACT-010` `saveFoodLog(input, asUserId)`. Input: `foodName` (trimmed, 1 to 200), `proteinG`, `carbsG`, `fatG` (0 to 2000), `imageUrl` (nullable, maximum 2048), `day` (optional ISO date).

- The image must be null, an upload of this user, or a permitted URL. If not, show "That image can't be attached to a meal."
- With no day, `logged_at` is `now()`.
- With a day, `logged_at` is that day plus the current local time, in the timezone of the person.

`ACT-011` `updateFoodLog(id, asUserId, form)`. Fields: `foodName`, `proteinG`, `carbsG`, `fatG`, `loggedAt` (local `YYYY-MM-DDTHH:MM`, optional seconds) and `notes` (trimmed, maximum 2000, blank is null).

- Interpret `loggedAt` in the timezone of the person.
- If the meal does not exist, show "That meal no longer exists."

`ACT-012` `deleteFoodLogs(ids, asUserId)`. Accept 1 to 1000 uuids. Delete only the rows of the user. Then delete their photos (`STO-006`).

`ACT-013` `pasteFoodLog(id, day, asUserId)`. This action copies a meal to a day.

- In `mock` mode, the source meal can belong to any person. In `supabase` mode, RLS limits it to the user.
- Copy the name, macros, notes and photo (`STO-007`).
- If the day is today, `logged_at` is `now()`.
- If not, use the same local time of day as the source meal, on the target day.
- If the source does not exist, show "The copied meal no longer exists."

### 11.3 Weight, workout and drink actions

`ACT-020` `saveWeight(weightKg, day, asUserId)`. The weight must be 20 to 500. Upsert the row for that day. Set `current_weight_kg` to this weight only if no later day has a weight.

`ACT-021` `saveWorkout(id, asUserId, form)`. Fields: `workoutType` (1 to 60), `durationMinutes` (1 to 1440), `caloriesBurned` (0 to 10000), `workedOutOn` (date), and an optional `weightKg`.

- If the form has a weight and no workout details, record only the weight.
- If not, insert the workout (id null) or update it (id given).
- If a weight is given, record it on the same day (`ACT-020`).

`ACT-022` `deleteWorkout(id, asUserId)`. Delete the workout of the user.

`ACT-023` `changeDrink({drinkType, day, change}, asUserId)`. `change` is +1 or −1.

- For +1, insert one glass. On conflict, add one glass, to a maximum of 50.
- For −1, delete the row if it has one glass or fewer. If not, subtract one glass.

### 11.4 Profile action

`ACT-030` `saveProfile(asUserId, form)`. Fields: the five targets (integers in the ranges of `user_profiles`), `currentWeightKg` and `goalWeightKg` (blank is null, 20 to 500), and `timezone`.

- If a field is not valid, show "Check the value for `<field>`."
- If PostgreSQL does not know the timezone, show "That timezone isn't recognised."
- On success, show "Goals saved."

### 11.5 Phone actions

`ACT-040` `choosePerson(userId)` opens a session (`AUTH-032`). Then it goes to `/m`.

`ACT-041` `addPerson(form)`. The name is trimmed, 1 to 40 characters. The form also sends the browser timezone. See `AUTH-033`.

`ACT-042` `loadHistoryMonth(month)` and `loadHistoryDay(day)` return history data for the phone user. They return null for input that is not valid.

`ACT-043` `switchPerson()`. See `AUTH-035`.

`ACT-044` In `supabase` mode, `choosePerson` and `addPerson` must go to `/login`.

### 11.6 Session and group actions (`mock` mode only)

`ACT-050` `endSessionNow(id)`: set `ended_at`. The row stays.

`ACT-051` `removeSessionFromList(id)`: delete the session row. The person and the meals stay.

`ACT-052` `deletePerson(userId)`: delete the `auth.users` row. This cascades to all data of the person. Then delete the photos of the person. The action must refuse `MOCK_USER_ID`.

`ACT-053` `saveGroup(id, name)`: add a group (id null) or rename one. The name is 1 to 40 characters and unique, case-insensitive. On a conflict, show "There's already a group called `<name>`."

`ACT-054` `deleteGroup(id)`: delete the group. Its people become ungrouped.

`ACT-055` `movePerson(userId, groupId)`: put the person in the group, or remove the person from all groups if `groupId` is null.

### 11.7 Settings actions (`mock` mode only)

`ACT-060` `loadVisionConfig()` returns `provider`, `baseUrl`, `model` and `hasApiKey`. It must not return the API key.

`ACT-061` `saveVisionConfig(form)`. Fields: `provider` (`openai` or `mock`), `baseUrl` (http or https, trailing slashes removed), `model` (1 to 200), `apiKey` (maximum 500) and `clearApiKey`.

- Upsert the provider, URL and model.
- Save the key only if it is not blank.
- If `clearApiKey` is set and the key is blank, delete the saved key.

`ACT-062` `testVisionConnection(baseUrl, apiKey)`. Send `GET <baseUrl>/models` with a 5 s timeout. Return the sorted model ids, or a fixed message:

- 401 or 403: "The endpoint refused the API key."
- A different error status: "The endpoint replied with status N."
- The body is not a model list: "That doesn't look like an OpenAI-compatible endpoint."
- No connection: "Couldn't reach that endpoint."

`ACT-063` Send the saved API key only to the URL that it was saved for. This prevents a person from capturing the key with a different server.

---

## 12 Desktop dashboard (`/`)

### 12.1 Layout

`DSK-001` A sticky header shows "Nutrition Tracker" as a link to `/`. In `mock` mode, it also shows a Settings button.

`DSK-002` The main area has a maximum width of 100 rem.

`DSK-003` In `mock` mode, the page has two columns on wide screens. The sessions panel (28 rem) is on the left. The dashboard of the selected person is on the right.

`DSK-004` The selected session comes from the query parameter `session`. If it is missing, use the most recently used open session. If there is none, use the first session.

`DSK-005` If there are no sessions in `mock` mode, show "No users yet" and a help text.

`DSK-006` In `supabase` mode, show the dashboard of the current user. If there is no user, go to `/login`.

### 12.2 Live refresh

`DSK-010` Each 3 s, the browser must get `/api/dashboard/version`. If the version changes, it must refresh the server data. Open forms must keep their state.

`DSK-011` Each 60 s, the browser must refresh the server data, so that time text such as "Active now" stays correct.

`DSK-012` Do not do these checks while the page is hidden.

### 12.3 Heading

`DSK-020` The heading is the name of the person, or "Today". Below it, show the date and, in `mock` mode, the device label.

`DSK-021` The heading row has the Database button (if enabled) and "Edit goals". When the projection status is `needs_profile`, do not show "Edit goals".

### 12.4 Totals for today

`DSK-030` Show five KPI cards:

1. **Calorie balance.** The value is |target − net| with unit "kcal left" or "kcal over". If over, show the status "Over target" in the warning tone. The caption is "E eaten, B burned, of T kcal", or "E of T kcal eaten" if nothing was burned.
2. **Protein.** This is a minimum. At or above the target, show "Target met" in the good tone.
3. **Carbs.** This is a limit. Above the target, show "Over target" in the warning tone.
4. **Fat.** This is a limit. Same rule as Carbs.
5. **Drinks.** The value is the glasses today. The caption is the summary, or "Goal is N glasses". At or above the goal, show "Goal met".

### 12.5 Log a meal

`DSK-040` The card "Log a meal" has a drop zone and an "Enter meal" button.

`DSK-041` The drop zone accepts drop, click and paste (⌘V). It accepts JPEG, PNG and WebP up to 8 MB.

`DSK-042` After a photo is accepted, do these steps:

1. Show the photo and "Analyzing your photo" with a Cancel button.
2. Send the photo to `/api/vision/analyze`.
3. Show a review form with the confidence, the name and the three macros. Show the calculated calories as live text.
4. On Save, call `saveFoodLog`. On success, go back to the drop zone.

`DSK-043` Cancel must stop the request.

`DSK-044` "Enter meal" opens a dialog with these fields: Item, Quantity (with − and + controls), Protein (g), Carbs (g), Fat (g) and Date. The text "Values are per serving." is shown. See `CALC-040` to `CALC-043`.

### 12.6 Projection and goals

`DSK-050` The card "Goal weight projection" shows the projection message and the current goals: Calories, Protein, Carbs, Drinks, Current weight and Goal weight. A value that is not set shows "Not set".

`DSK-051` Until a goal exists, the card shows a "Set goals" button.

`DSK-052` The Goals dialog has: current weight, goal weight, daily targets (calories, protein, carbs, fat), the drinks target and the timezone. The timezone list contains the current zone, `UTC`, and all values of `Intl.supportedValuesOf("timeZone")`.

`DSK-053` When the person enters both weights, fill the targets from `CALC-031`. A target that the person changes after this keeps its value. The drinks target does not depend on weights.

`DSK-054` In `supabase` mode, the Goals dialog has a sign-out control.

### 12.7 Activity panel

`DSK-060` The panel "Activity" has three tabs: Meals, Workouts and Drinks.

`DSK-061` The Meals tab shows the meals of the last 30 days, grouped by day, as a tree.

- Only the newest day is open by default. The panel remembers the days that the person opens or closes.
- Each day row shows the label, calories, protein, carbs, fat and the goal badge.
- Each meal row shows the time, the name, the photo, the macros, the notes and the actions Copy, Edit and Delete.
- On narrow screens, hide the macros and show the notes below the name.

`DSK-062` Delete must ask for confirmation. A day row can delete all meals of that day.

`DSK-063` Copy saves `{id, foodName}` in `localStorage` key `trackerx.copied-meal`. All open tabs must see the change. The copied meal stays after a reload and after a change of person.

`DSK-064` When a meal is copied, the Meals tab shows a paste bar. The bar has a day selector, Paste, and Clear.

`DSK-065` Edit opens a dialog with name, macros, local date and time, and notes.

`DSK-066` The Workouts tab lists the workouts: date, workout type, duration, calories burned, and the actions Edit and Delete. "Add workout" opens a form. The workout type has suggestions: Running, Walking, Cycling, Strength, Swimming, HIIT, Yoga, Rowing. The form also has an optional weight field with the hint "Optional. Fill in only this to record just your weight."

`DSK-067` The Drinks tab lists the editable days (`CALC-061`). Each day has − and + controls for each drink type, and a total.

### 12.8 Progress panel

`DSK-070` The panel "Progress" has four charts:

1. Weight, with a goal weight line.
2. Net calories, with a target line.
3. Protein, carbs and fat.
4. Glasses for each day, from zero, with a goal line.

`DSK-071` A chart with no data shows a help text, for example "Log a meal to start the chart."

`DSK-072` The panel can collapse. The browser remembers its state in `localStorage`.

### 12.9 Sessions panel (`mock` mode)

`DSK-080` The panel lists sessions with these columns: User, Started, Duration, Status and Actions. The sort is Newest or Oldest by start time, from the query parameter `sort`.

`DSK-081` Show sessions under their groups, in alphabetical order. Show the ungrouped sessions last. Show empty groups, because a person can be dragged to them.

`DSK-082` Each group row shows the group summary (`CALC-092`). The group can open and close. The browser remembers closed groups in `localStorage`.

`DSK-083` A person can be dragged to a different group. Accept only drags of a session row.

`DSK-084` The "New group" button adds a group. "Rename or delete" edits a group. Delete asks for confirmation.

`DSK-085` The actions menu of a session has: Group, End session, Remove from list, and "Delete `<name>` and all their meals". The last item is not shown for `MOCK_USER_ID`.

`DSK-086` Click on a session row to select that session.

---

## 13 Phone app (`/m`)

### 13.1 Style

`MOB-001` The phone app must look like a native iOS app. It uses the iOS system colors, with a light and a dark set:

| Token | Light | Dark |
| --- | --- | --- |
| `ios-bg` | `#f2f2f7` | `#000000` |
| `ios-card` | `#ffffff` | `#1c1c1e` |
| `ios-label` | `#000000` | `#ffffff` |
| `ios-secondary` | `#3c3c4399` | `#ebebf599` |
| `ios-tertiary` | `#3c3c434d` | `#ebebf54d` |
| `ios-separator` | `#3c3c434a` | `#54545899` |
| `ios-fill` | `#78788029` | `#78788052` |
| `ios-bar` | `#f9f9f9cc` | `#1e1e1ecc` |
| `ios-blue` | `#007aff` | `#0a84ff` |
| `ios-green` | `#34c759` | `#30d158` |
| `ios-orange` | `#ff9500` | `#ff9f0a` |
| `ios-red` | `#ff3b30` | `#ff453a` |

`MOB-002` The base text size is 17 px. Pages use large titles, grouped sections and rows.

`MOB-003` Sheets open from the bottom with a 0.34 s animation (`cubic-bezier(0.32, 0.72, 0, 1)`).

`MOB-004` The layout must respect the safe area insets. The viewport uses `viewport-fit=cover`. The page sets `apple-mobile-web-app-capable`.

### 13.2 Sign-in (`/m/sign-in`)

`MOB-010` The title is "Who's Using This?".

`MOB-011` If cookie `m-last-person` identifies a person, show a button with the initial and the name of that person. Do not show the names of other people.

`MOB-012` Show the "Add person" form with a name field. The form sends the browser timezone.

`MOB-013` Show a disabled "Sign In with Email" button with the text "Sign in is coming soon."

`MOB-014` In `supabase` mode, go to `/login`.

### 13.3 Tab bar

`MOB-020` A fixed bottom bar has five items: Today (`/m`), History (`/m/history`), Add Meal, Progress (`/m/progress`) and Account (`/m/account`).

`MOB-021` The current tab is blue and has `aria-current="page"`.

`MOB-022` Add Meal opens the capture sheet.

### 13.4 Capture sheet

`MOB-030` The first step has three choices: "Take Photo", "Choose from Library", and manual entry. Use a `label` around the file input, because iOS Safari opens the picker reliably only this way.

`MOB-031` After a photo, show the analysis and then a review form. The review form has Item, the macros, Calories (calculated, read-only) and Date.

`MOB-032` Manual entry has Item, Quantity (− and +), Per Serving and Total values, and Date.

`MOB-033` Show the text "Calories are calculated from the macros."

`MOB-034` On an error, show an alert "Couldn't Add Meal" with the message.

### 13.5 Today (`/m`)

`MOB-040` Show the large title "Today" and the date.

`MOB-041` Show a calorie ring and three macro bars:

- The ring shows net calories against the target. Its value is |remaining| with "kcal left" or "kcal over".
- The ring is green when under the target and orange when over it.
- The ring diameter is 132 px and the stroke is 14 px.
- Each macro bar shows "eaten / target g".

`MOB-042` Show a weight row. The row has a value field, a date field and Save.

`MOB-043` Show the Drinks section. It has − and + controls for each drink type, and the footer "Add drinks with milk or sugar as a meal too, so their calories count."

`MOB-044` Show the Workouts section for today, with a "New Workout" sheet. The sheet has Type, Duration, Calories Burned and Date.

`MOB-045` Show the meals of today. Each meal links to `/m/meals/<id>`. If there are none, show "No meals yet today. Tap Add Meal to log your first one."

### 13.6 History (`/m/history`)

`MOB-050` Show one month at a time. Start with the newest month that has data.

`MOB-051` Each month shows its days with data (meals, workouts or drinks). Each day shows the short label (for example "Mon 3"), the calories, the burned calories, the glasses and the goal score.

`MOB-052` Open a day to load its meals and workouts.

`MOB-053` A control loads the next older month that has data.

`MOB-054` If there is no data, show "Meals you log will appear here."

### 13.7 Meal page (`/m/meals/[id]`)

`MOB-060` Show a back button, an Edit button, the photo (4:3), the name, the day and time, a Nutrition section (calories, protein, carbs, fat) and the notes.

`MOB-061` The "Add to day" control copies the meal to a selected day (`ACT-013`). The control stays on the page, so that the person can add the meal to more days.

`MOB-062` If the id is not valid or the meal does not exist, return "not found".

### 13.8 Progress (`/m/progress`)

`MOB-070` Show the same four charts as `DSK-070`, in the phone style.

### 13.9 Account (`/m/account`)

`MOB-080` Show the name of the person and "Not signed in". Show a row "Sign In" with "Coming Soon".

`MOB-081` Show the daily goals, read-only, with the footer "Change these on the desktop dashboard."

`MOB-082` Show a red "Switch Person" button.

---

## 14 Administration tools

### 14.1 Settings (`mock` mode)

`ADM-001` The Settings button opens a dialog with the text "Options for the whole app, for everyone using it." Load the settings each time the dialog opens.

`ADM-002` The "Vision model" section has these fields:

- Provider: "OpenAI-compatible endpoint (Ollama, vLLM)" or "Mock (canned answers, for testing)".
- Endpoint URL.
- API key. If a key is saved, show "A key is saved. Leave this blank to keep it."
- Model. "Test connection" fills the list of models.

The buttons are "Test connection" and "Save settings".

`ADM-003` Changes apply to the next photo.

### 14.2 Database viewer

`ADM-010` The viewer is available only when `ENABLE_DB_VIEWER=true`.

`ADM-011` The viewer is a panel. It loads data only while it is open. It reloads when the dashboard data changes.

`ADM-012` The viewer can show only the tables in a fixed allowlist. A request can only name a table from this list. Text from a request must never become an SQL identifier.

`ADM-013` The allowlist and the editable columns are:

| Table | Editable columns | Server only |
| --- | --- | --- |
| `user_profiles` | `display_name`, the five targets, `current_weight_kg`, `goal_weight_kg` | No |
| `food_logs` | `food_name`, `protein_g`, `carbs_g`, `fat_g`, `notes`, `logged_at` | No |
| `weight_logs` | `weight_kg` | No |
| `workouts` | `workout_type`, `duration_minutes`, `calories_burned` | No |
| `drink_logs` | `glasses` | No |
| `device_sessions` | None | Yes |
| `session_groups` | None | Yes |
| `person_groups` | None | Yes |
| `app_settings` | None | Yes |
| `auth.users` | None | Yes |

`ADM-014` Keys, owners, audit columns, `calories`, `image_url` and `timezone` must stay read-only.

`ADM-015` Show a maximum of 200 rows for each table, and the total count.

`ADM-016` In `mock` mode, read all tables as the server. In `supabase` mode, read with `withUser` and leave out server-only tables.

`ADM-017` Replace the value of `app_settings` key `vision.api_key` with `••••••••` before it goes to the browser.

`ADM-018` A blank value in a nullable column is null. A blank value in a column that is not nullable is an error.

`ADM-019` Cast the value to the column type in SQL. If PostgreSQL refuses the value with SQLSTATE class 22 or 23, show "Postgres refused this: `<message>`". Re-throw all other errors.

`ADM-020` Enter saves a cell. Escape cancels the edit. A second Escape closes the panel.

---

## 15 Security

`SEC-001` Every response must have these headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

Do not send `X-Powered-By`.

`SEC-002` All user data access must go through `withUser`, so that RLS applies (`DB-202`).

`SEC-003` In `supabase` mode, `asUserId` must have no effect (`AUTH-010`).

`SEC-004` Image URLs must pass `VIS-041`. This prevents server-side request forgery.

`SEC-005` Upload keys must pass `STO-004`. This prevents path traversal.

`SEC-006` Photos are served with `Content-Security-Policy: default-src 'none'`.

`SEC-007` The API key must not go to the browser (`ACT-060`, `ADM-017`, `ACT-063`).

`SEC-008` By default, the local stack binds the app to `127.0.0.1`. The phone mode binds to `0.0.0.0` only when the operator runs `pnpm stack:phone`.

`SEC-009` Mark each place that real authentication must replace with the comment `AUTH PLACEHOLDER`.

`SEC-010` WARNING: In `mock` mode, all persons on the network can use the app as any person. This includes the database viewer. Use `mock` mode only on a trusted network.

---

## 16 Build, run and deploy

### 16.1 Container image

`OPS-001` Build the image from the repository root with `apps/nutrition-tracker/Dockerfile`. Use these stages:

1. **base**: `node:26-alpine`. Install `pnpm@12.16.1` and `turbo@2.11.10` with npm. Set `NEXT_TELEMETRY_DISABLED=1`.
2. **pruner**: copy the repository. Run `turbo prune nutrition-tracker --docker`.
3. **builder**: copy `out/json`. Run `pnpm install --frozen-lockfile`. Copy `out/full` and `tsconfig.base.json`. Run `pnpm turbo run build --filter=nutrition-tracker`.
4. **runner**: `node:26-alpine` with `NODE_ENV=production`, `HOSTNAME=0.0.0.0` and `PORT=3000`. Make `/data/uploads`, owned by `node`. Copy `.next/standalone` and `.next/static`. Run as user `node`. Start with `node apps/nutrition-tracker/server.js`.

### 16.2 Local stack

`OPS-010` `compose.yaml` must have the project name `trackerx` and two services.

Service `db`:

- Image `docker.io/library/postgres:17-alpine`, with user, password and database `postgres`.
- Port `127.0.0.1:54322:5432`.
- Volume `db-data`. Mount `infra/local/initdb` on `/docker-entrypoint-initdb.d` (read-only, `z`). Mount `supabase` on `/supabase` (read-only, `z`).
- Health check over TCP: `pg_isready -h 127.0.0.1`. Use an interval of 2 s and 30 retries. TCP is necessary because the health check must fail until the migrations are complete.

Service `app`:

- Image `localhost/trackerx/nutrition-tracker:local`. It starts after `db` is healthy.
- Environment: `AUTH_MODE=mock`, `ALLOW_MOCK_AUTH=true`, `STORAGE_DRIVER=local`, `UPLOAD_DIR=/data/uploads`.
- `ENABLE_DB_VIEWER` defaults to `true`. `VISION_PROVIDER` defaults to `openai`.
- `VISION_BASE_URL` defaults to `http://host.containers.internal:11434/v1`. `VISION_MODEL` defaults to `qwen3.5:9b`.
- Port `${APP_BIND:-127.0.0.1}:3000:3000`. Volume `uploads` on `/data/uploads`.
- Health check: fetch `http://127.0.0.1:3000/api/health` with Node. Use an interval of 5 s and 12 retries.

`OPS-011` Use fully qualified image names, so that Podman can find them.

`OPS-012` `scripts/engine.sh` selects Podman if it is available. `COMPOSE_ENGINE=docker` overrides this.

`OPS-013` `scripts/stack-phone.sh` must do these steps:

1. Build the image.
2. Start the stack with `APP_BIND=0.0.0.0`.
3. Find the local network address from interfaces `en0` to `en4`.
4. Print a QR code and the URL `http://<address>:3000/m`. Save the QR code as `phone-qr.png`.
5. Print a warning that all persons on the network can use the app.

`OPS-014` `scripts/db-apply.sh <file>` applies one new migration to a running database. The data stays.

### 16.3 Local development procedure

To start the app for development, do these steps:

1. Install Node 26.
2. Run `npm install -g pnpm@12.16.1`.
3. Run `pnpm install`.
4. On macOS with Podman, run `podman machine start`.
5. Run `pnpm db:up`.
6. Copy `apps/nutrition-tracker/.env.example` to `apps/nutrition-tracker/.env.local`.
7. To use a real vision model, run `ollama pull qwen3.5:9b`.
8. Run `pnpm dev`.
9. Open `http://localhost:3000`.

CAUTION: `pnpm db:reset` deletes all data in the local database.

### 16.4 Cloud deployment

`OPS-020` `infra/gcp/cloudbuild.yaml` must build, push and deploy the image to Cloud Run. Use these default substitutions: region `europe-north1`, repository `trackerx`, service `nutrition-tracker`, bucket `nutrition-uploads`.

`OPS-021` The Cloud Run service must use `--allow-unauthenticated` with these environment values: `AUTH_MODE=supabase`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `STORAGE_BUCKET`.

`OPS-022` `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must come from the Secret Manager secrets `nutrition-database-url` and `nutrition-supabase-service-role-key`.

To deploy, do these steps:

1. Run `supabase link --project-ref <ref>`.
2. Run `supabase db push`.
3. Make a private Storage bucket with the name `nutrition-uploads`.
4. In the Magic Link email template, add `{{ .Token }}`. The sign-in form asks for a code.
5. Make the two secrets. Use the transaction pooler string (port 6543) for the database URL.
6. Give the Cloud Run service account access to the secrets.
7. Make an Artifact Registry repository with the name `trackerx`.
8. Run `gcloud builds submit --config infra/gcp/cloudbuild.yaml --substitutions=_SUPABASE_URL=<url>,_SUPABASE_ANON_KEY=<key> .`

CAUTION: Do not apply `infra/local` to Supabase. Supabase already has these objects.

NOTE: `supabase db push` does not apply `seed.sql`.

NOTE: Without vision settings, a cloud deployment uses the mock provider.

### 16.5 Add a different app

To add a new app to the platform, do these steps:

1. Copy `apps/nutrition-tracker`. Change the name in `package.json`.
2. Add a `turbo prune` target and a `compose.yaml` service.
3. Add a migration that makes schema `app_<name>`, with RLS on each table.
4. Query through a function like `withUser`.

---

## 17 Tests

`TST-001` Use Vitest. Put each test file next to its source file, with the name `*.test.ts`.

`TST-002` Write unit tests for these modules:

| Module | Subject |
| --- | --- |
| `lib/nutrition/calories` | `CALC-001` |
| `lib/nutrition/chart` | `CALC-080` to `CALC-083` |
| `lib/nutrition/drinks` | `CALC-060` to `CALC-063` |
| `lib/nutrition/group-logs` | `CALC-010` to `CALC-012`, `CALC-050` to `CALC-052` |
| `lib/nutrition/history` | `CALC-070`, `CALC-071` |
| `lib/nutrition/manual-meal` | `CALC-040` to `CALC-043` |
| `lib/nutrition/projection` | `CALC-020`, `CALC-021` |
| `lib/nutrition/schemas` | Input validation |
| `lib/nutrition/targets` | `CALC-030`, `CALC-031` |
| `lib/nutrition/workouts` | Burned totals, "weight only" form |
| `lib/session-summary` | `CALC-090` to `CALC-092` |
| `lib/session` | Token refresh rules, cookies |
| `lib/auth` | Token verification |
| `lib/device-label` | `AUTH-031` |
| `lib/storage/keys` | `STO-004`, `STO-005` |
| `lib/db-viewer/tables` | `ADM-012` to `ADM-019` |
| `lib/vision/image` | `VIS-040`, `VIS-041` |
| `lib/vision/mock-provider` | `VIS-030` to `VIS-032` |
| `lib/vision/openai-provider` | `VIS-020` to `VIS-027` |
| `lib/vision/settings` | URL normalization, model list |
| `app/api/vision/analyze/route` | `API-030` to `API-037` |

`TST-003` Before you release, run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`. All four must pass.