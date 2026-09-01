# SCOUT Phase 1 v0.2

SCOUT is an internal visual-location scouting prototype.

## Mock mode
1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run db:generate`
4. Run `npm run db:push`
5. Run `npm run dev`
6. Open http://localhost:3000

Mock mode does not require API keys. It supports a free-form request plus 0–2 reference images and optional comments.

## Live mode
Set `SCOUT_MODE=live` and configure:
- `OPENAI_API_KEY`
- `OPENAI_DIRECTION_MODEL`
- `PEXELS_API_KEY`

Model IDs are intentionally configured via environment variables rather than hard-coded. Verify the current supported model before changing production settings.

## Windows
Double-click `START_SCOUT.bat`. On first run it installs dependencies and initializes Prisma.

## Security
Never commit `.env`, API keys, local databases, or uploaded reference images.

## Phase 1 scope
INPUT → 8 visual directions → search → 4 representative images per direction.
