# AGENTS.md

## Project Context

This repository implements **Notion Heatmap**, a personal, self-hosted Notion annual heatmap widget.

Authoritative product and technical source documents:

- Project hub: https://app.notion.com/p/36c1d100ccaf80c6897fe6acc6a1d1f0
- Product requirements: https://app.notion.com/p/3751d100ccaf8144a569f7ac7f13d1c0
- Technical design: https://app.notion.com/p/3751d100ccaf817d8c98f9a274b789c5

The project is intended for lightweight deployment on Vercel and embedding into Notion with `/embed`.

## Documentation Default

- Store all project documentation in the Notion project hub by default: https://app.notion.com/p/36c1d100ccaf80c6897fe6acc6a1d1f0
- When new documentation is needed, create or update a Notion child page under the project hub instead of adding local documentation files.
- Keep local repository docs to the minimum required for agent/project instructions or tooling compatibility.
- If local notes, diagrams, or generated documentation artifacts are needed temporarily while working, place them in `/tmp` and do not treat them as project documentation.

## Product Principles

- Personal self-deployment first.
- Keep the MVP lightweight; do not build a multi-user SaaS.
- Notion token must live only in server-side environment variables.
- Do not store the Notion token in frontend code, browser storage, URLs, or logs.
- Prefer signed configuration links over persistent database storage for MVP.
- Query and aggregate Notion data on the server; send only aggregated heatmap data to the frontend.
- Optimize the `/embed` experience for Notion: fast load, low memory use, compact UI, stable layout.
- Keep the heatmap visually close to GitHub contribution graphs while fitting Notion's restrained visual style.

## Confirmed Stack

- Framework: Next.js
- Language: TypeScript
- Deployment: Vercel
- Notion API client: `@notionhq/client`
- Heatmap rendering: CSS Grid with HTML elements
- Styling: CSS Modules or lightweight global CSS
- Config signing: HMAC-SHA256
- Storage: no persistent database for MVP

Avoid for MVP:

- OAuth login
- Multi-user accounts
- Persistent databases such as Postgres, Supabase, MongoDB, or Vercel KV
- Heavy UI component libraries
- Heavy charting libraries
- Frontend token input or token persistence

## Required Environment Variables

```plain
NOTION_TOKEN=secret_xxx
CONFIG_SECRET=random-long-secret
ADMIN_KEY=your-admin-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Read environment variables through a central module such as `lib/env.ts`. Avoid direct scattered `process.env` access.

## MVP Routes

- `/setup`: configuration page for entering `ADMIN_KEY`, connecting a Notion database, selecting fields and filters, previewing, and generating an embed URL.
- `/embed`: compact Notion embed page that renders the heatmap from `config` and `sig` query params.
- `/api/schema`: validates `ADMIN_KEY`, parses a database URL or ID, reads Notion database schema, and returns usable date/filter fields.
- `/api/config/sign`: validates `ADMIN_KEY`, validates config, Base64URL-encodes it, signs it, and returns the final embed URL.
- `/api/heatmap`: verifies config signature, queries Notion, aggregates data by date, calculates stats, and returns frontend-safe data.

## Configuration Contract

Use versioned signed config. MVP UI may support one source, but the data model should keep `sources` as an array for future multi-database support.

```ts
export type HeatmapConfig = {
  version: 1;
  sources: HeatmapSource[];
  display: DisplayConfig;
  timezone: string;
};

export type HeatmapSource = {
  databaseId: string;
  databaseUrl?: string;
  databaseName?: string;
  dateProperty: string;
  filters: SourceFilter[];
};

export type SourceFilter = {
  property: string;
  type: 'status' | 'select' | 'multi_select' | 'checkbox';
  value: string | boolean | string[];
};

export type DisplayConfig = {
  mode: 'rollingYear' | 'calendarYear';
  year?: number;
  theme: 'github';
};
```

Embed URL format:

```plain
/embed?config=xxx&sig=yyy
```

`config` is Base64URL-encoded JSON. `sig` is an HMAC-SHA256 signature of the encoded config string using `CONFIG_SECRET`.

## Security Requirements

- `/setup` and `/api/config/sign` require `ADMIN_KEY`.
- `/api/schema` requires `ADMIN_KEY`.
- `/api/heatmap` must reject unsigned or tampered configs before querying Notion.
- Use constant-time comparison for signature verification.
- Never expose `NOTION_TOKEN` to frontend code, URLs, browser storage, or client-visible error messages.
- Do not return full Notion API page objects to the frontend.
- Do not log full Notion API responses in public/serverless logs.
- Public APIs must not accept arbitrary database URLs and query with `NOTION_TOKEN` unless the request is authorized and/or signed as specified.

## Notion Data Rules

- Accept Notion database URLs or raw database IDs.
- Parse and normalize database IDs robustly from URLs with query params or hyphenated UUIDs.
- User must manually connect the Notion Integration to target databases.
- Schema support for MVP:
  - date properties as heatmap date source
  - status/select/multi_select/checkbox properties as optional filters
- If a date field contains a range, use the `start` date.
- If a date field includes time, convert it to a `YYYY-MM-DD` key using the configured timezone.
- Default timezone is `Asia/Taipei`.
- Notion pagination must be handled; query with `page_size: 100` and loop while `has_more`.
- Push date range and filters down to Notion API where practical.

## Heatmap Rules

- Support `rollingYear` and `calendarYear`.
- `rollingYear`: from today's date minus one year through today, producing a complete 365- or 366-day grid.
- `calendarYear`: from January 1 through December 31 of the selected year.
- Current-year future dates should render as empty cells.
- Missing data dates must still render cells.
- Use `YYYY-MM-DD` as the date key.
- Use fixed GitHub-style levels for MVP:
  - 0: 0 records
  - 1: 1 record
  - 2: 2-3 records
  - 3: 4-6 records
  - 4: 7+ records
- Return stats:
  - `total`
  - `activeDays`
  - `longestStreak`
  - `currentStreak`
- Tooltip MVP content:
  - date
  - record count
  - level/intensity

## UI Requirements

- `/embed` should be visually centered on the heatmap, not on explanatory text.
- Use compact controls such as select, segmented control, and icon buttons.
- Keep text minimal in the embed page.
- Support narrow Notion embed widths without text overlap.
- Use CSS Grid or lightweight HTML rendering for the heatmap.
- Do not introduce a large charting library.
- Do not make `/embed` a complex configuration surface.
- `/setup` can be more complete than `/embed`, but should still feel lightweight and task-focused.

## Recommended Project Structure

```plain
app/
  layout.tsx
  page.tsx
  setup/
    page.tsx
    setup.module.css
  embed/
    page.tsx
    embed.module.css
  api/
    schema/
      route.ts
    config/
      sign/
        route.ts
    heatmap/
      route.ts
components/
  Heatmap/
    Heatmap.tsx
    Heatmap.module.css
    HeatmapTooltip.tsx
    HeatmapLegend.tsx
    HeatmapStats.tsx
  SetupForm/
    SetupForm.tsx
    SetupForm.module.css
lib/
  notion/
    client.ts
    schema.ts
    query.ts
    parseDatabaseId.ts
  config/
    encode.ts
    sign.ts
    validate.ts
  heatmap/
    dates.ts
    aggregate.ts
    stats.ts
    levels.ts
  env.ts
  errors.ts
types/
  config.ts
  notion.ts
  heatmap.ts
styles/
  globals.css
```

## Implementation Order

1. Initialize Next.js + TypeScript and basic styles.
2. Implement static heatmap date grid, levels, tooltip, and stats with mock data.
3. Implement config encoding, decoding, signing, and verification.
4. Implement `/api/config/sign` and `/embed` config loading.
5. Implement database ID parsing, Notion client, and `/api/schema`.
6. Implement Notion query pagination, filter building, aggregation, and `/api/heatmap`.
7. Wire `/setup` and `/embed` to real API responses.
8. Polish Notion embed layout, loading, empty, and error states.
9. Write deployment and troubleshooting documentation in the Notion project hub. Keep any local README minimal and pointer-only unless tooling requires more.

## Testing And Verification

Add focused tests around logic with high regression risk:

- database ID parsing
- config encode/decode
- HMAC signing and verification
- config validation
- date range generation
- timezone date key conversion
- heatmap level calculation
- stats and streak calculation
- Notion query pagination behavior where practical

Before claiming implementation work is complete, run the relevant lint, typecheck, and test commands for the project. If the project has not been initialized yet, state that verification is limited to document/file inspection.

## Documentation Notes

- The Notion project hub should explain Notion Integration creation, database authorization, Vercel env vars, `/setup`, embed URL generation, Notion `/embed`, and common errors.
- Keep docs aligned with the Notion product and technical documents linked above.
- If the Notion docs are revised, treat them as the source of truth and update this file accordingly.
