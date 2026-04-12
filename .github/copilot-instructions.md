# LogiX AI Coding Guide

## What this repo is
- Monorepo for LogiX: `backend/` Express + TypeORM API, `frontend/` Vue 3 UI, plus a separate `logistics-path-system/` path/status microservice.
- Database-first design: `backend/03_create_tables.sql` is the authoritative schema.
- Key project conventions are enforced by `.cursor/rules/logix-development-standards.mdc` and `.cursor/rules/logix-project-map.mdc`.

## Important architecture patterns
- Backend routes are organized under `backend/src/`; controllers should stay thin, business logic belongs in `services/`.
- All data model names use snake_case in SQL/JSON payloads and camelCase in TypeScript entities via `@Column({ name: '...' })`.
- Frontend API clients live in `frontend/src/services/`; `frontend/src/services/api.ts` configures Axios and `frontend/src/services/container.ts` is the main container API example.
- Excel/import mapping relies on exact table/field names, so do not change mapping names without updating `frontend/src/views/import/ExcelImport.vue` and backend import adapters.
- Date filtering is central: top-page date range drives queries and statistics; core fields are `actual_ship_date` and fallback `shipment_date`.

## Developer workflows
- Startup the full dev environment: `.
start-logix-dev.ps1`
- Root validation: `npm run validate`, `npm run quality`, `npm run lint`, `npm run type-check`.
- Backend local work: `cd backend && npm run dev`; build `npm run build`; tests `npm test`; type-check `npm run type-check`.
- Frontend local work: `cd frontend && npm run dev`; build `npm run build`; tests `npm test`; type-check `npm run type-check`.
- Use `npm run check:...` at root for project-specific architecture / problem / strategy review checks.

## Project-specific conventions
- Always align API payload field names with the database snake_case naming.
- Avoid temporary SQL patch fixes; incorrect import or mapping should be fixed at the source and re-imported.
- Frontend text must use localized strings; avoid hard-coded Chinese copy in components.
- Component logic should be split: pages are orchestration, reusable UI goes into `components/`, shared behavior goes into composables like `useXxx`.
- Controllers should not contain complex queries; move them into service/helper layers.

## Integration and cross-component notes
- `backend/` integrates with external FeiTuo adapters and logistics path services; the `logistics-path-system/` folder contains the path validation/GraphQL engine.
- Shared types and cross-service conventions are present in `shared/`.
- `frontend` proxies API calls to backend; `VITE_API_BASE_URL` is the source of truth for API base URL.

## Where to read first
- `.cursor/rules/logix-development-standards.mdc` for coding rules
- `.cursor/rules/logix-project-map.mdc` for table/entity/API mapping
- `backend/03_create_tables.sql` for schema baseline
- `frontend/src/services/container.ts` for main API patterns
- `frontend/public/docs/` for business logic and state-machine rules
