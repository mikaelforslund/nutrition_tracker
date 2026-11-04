# TrackerX

A Turborepo monorepo for a multi-app platform. Apps share a design system and one
PostgreSQL database, with a separate schema per app.

| Path | Purpose |
| --- | --- |
| `apps/nutrition-tracker` | Next.js 16 app: photo logging and dashboard |
| `packages/ui` | Shared Tailwind design system |
| `supabase/` | Migrations and seed data, in Supabase CLI layout |
| `infra/local` | Stand-in for the Supabase parts of the database, local only |
| `infra/gcp` | Cloud Build pipeline for Cloud Run |

## Run locally

Requires Node 26 and Podman or Docker. `scripts/compose.sh` prefers Podman; set
`COMPOSE_ENGINE=docker` to override.

```sh
nvm use                 # or put Homebrew's node@26 on your PATH
npm install -g pnpm@12.16.1
pnpm install

podman machine start    # macOS with Podman only
pnpm db:up              # Postgres on 127.0.0.1:54322, migrated and seeded

cp apps/nutrition-tracker/.env.example apps/nutrition-tracker/.env.local
pnpm dev                # http://localhost:3000
```

To run the production image instead: `pnpm stack:up`.

| Command | What it does |
| --- | --- |
| `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` | Run across the workspace through Turborepo |
| `pnpm db:reset` | Deletes the database, including your meals, and re-applies migrations and seed |
| `./scripts/db-apply.sh <file>` | Applies one new migration to a running database, keeping its data |

## Use it on your iPhone

`/m` is a phone app that runs in the browser, in the same service as the dashboard.

```sh
pnpm stack:phone    # prints the address to open on your phone
```

Open the address in Safari on the same Wi-Fi, then use Share > Add to Home Screen to
run it full screen. Go back to localhost only with `pnpm stack:up`.

People pick or add their name on the phone, and each device gets a session. The
dashboard's Sessions panel lists them, and selecting one opens that person's
dashboard, where you can log meals and edit them for that person. This only exists with `AUTH_MODE=mock`.

Anyone on the network can use the app in this mode, as any person, because sign-in
is only a placeholder so far. That includes the database viewer, which you can hide with
`ENABLE_DB_VIEWER=false pnpm stack:phone`. Look for
`AUTH PLACEHOLDER` in the code to find what real sign-in needs to replace.

## API

`POST /api/vision/analyze` takes either form:

```sh
curl -F task=NUTRITION -F image=@meal.jpg http://localhost:3000/api/vision/analyze

curl -H 'content-type: application/json' \
  -d '{"task":"NUTRITION","imageUrl":"https://images.example.com/meal.jpg"}' \
  http://localhost:3000/api/vision/analyze
```

The response matches `visionResponseSchema` in
`apps/nutrition-tracker/src/lib/vision/contract.ts`. URLs must be https and on
`VISION_ALLOWED_IMAGE_HOSTS`, which is empty by default.

## Vision models

`VISION_PROVIDER=openai` sends photos to any OpenAI-compatible server, and is the
default in `compose.yaml` and `.env.example`. It expects Ollama on the host with a
vision model pulled:

```sh
ollama pull qwen3.5:9b
```

Change the endpoint and model on the dashboard's Settings page, which overrides
`VISION_MODEL` and `VISION_BASE_URL`, or use `VISION_PROVIDER=mock` to run without a
model. Settings are stored in `app_settings`, with any API key in plain text, and the
page only exists with `AUTH_MODE=mock`. Without the variable, the app defaults to the mock, which is
what Cloud Run gets unless you configure a reachable inference server.

Photos are shrunk to `VISION_MAX_IMAGE_PX` (512 by default) before they reach the
model, because processing time grows with pixel count. The stored photo stays full
size.

`qwen3.5:9b` was chosen by comparing it with `gemma4` on the photos in `test/`. Calorie
figures are estimates from a photo and need checking in the review step, especially
for large or shared portions.

## Deploy to GCP and Supabase

1. Link the project and apply migrations:
   `supabase link --project-ref <ref> && supabase db push`.
2. Create a private Storage bucket named `nutrition-uploads`.
3. Under Authentication > Email Templates, add `{{ .Token }}` to the Magic Link
   template. Sign-in asks for a code, and the default template only sends a link.
4. Create the Secret Manager secrets `nutrition-database-url` (transaction pooler
   string, port 6543) and `nutrition-supabase-service-role-key`, and let the Cloud
   Run service account read them.
5. Create an Artifact Registry repository named `trackerx`.
6. Deploy:

   ```sh
   gcloud builds submit --config infra/gcp/cloudbuild.yaml \
     --substitutions=_SUPABASE_URL=https://<ref>.supabase.co,_SUPABASE_ANON_KEY=<anon-key> .
   ```

`infra/local` must never be applied to Supabase, which already provides those
objects. `seed.sql` isn't applied by `supabase db push`.

## Add another app

1. Copy `apps/nutrition-tracker`, rename it in `package.json`, and give it a new
   `turbo prune` target and `compose.yaml` service.
2. Add a migration under `supabase/migrations` that creates an `app_<name>` schema,
   with row level security on every table.
3. Query through a `withUser`-style helper so those policies apply. The app connects
   as a role that can bypass them otherwise.
