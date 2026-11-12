# Architecture diagrams

Interactive, standalone HTML diagrams made with Archify. Open them in a browser.
Each box links back to the source lines it was drawn from (commit `a0dd5ef`).

| Diagram | What it shows |
| --- | --- |
| [System overview](system-overview.html) | Runtime components: the Next.js UI and server, auth, data access with row level security, PostgreSQL, photo storage and the vision model. |
| [Database schema](database-erd.html) | Every table in `app_nutrition` and `auth.users`, with columns, keys and relationships. |
| [Logging a meal from a photo](photo-meal-logging.html) | The request sequence from photo to saved meal, including the live dashboard refresh. |
| [Phone session lifecycle](phone-session-lifecycle.html) | How a phone session (`AUTH_MODE=mock`) moves between Active, Inactive, Ended and Erased. |

The full written specification is in [SPECIFICATION.md](../../SPECIFICATION.md).

## Editing

The diagram sources are in `source/`. After a change, rebuild one diagram with:

```sh
node <archify>/bin/archify.mjs finalize <type> docs/architecture/source/<file>.json \
  docs/architecture/<name>.html --repo-root . --quality <showcase|standard> --json
```

Update `meta.repository.revision` in the source to the commit the citations refer to.
`receipts/` holds the check results from the last build.
