<!-- Improved compatibility of back to top link -->
<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=nextdotjs" alt="Next.js"></a>
  <a href="https://developers.google.com/calendar/api"><img src="https://img.shields.io/badge/Google_Calendar_API-Enabled-4285F4?style=for-the-badge&logo=googlecalendar&logoColor=white" alt="Google Calendar API"></a>
  <a href="https://supabase.com/docs/reference/javascript/introduction"><img src="https://img.shields.io/badge/Supabase_JS-2.91-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase"></a>
  <a href="https://developers.notion.com/"><img src="https://img.shields.io/badge/Notion_API-5.8-000000?style=for-the-badge&logo=notion&logoColor=white" alt="Notion API"></a>
</p>

<br />
<div align="center">
  <h3 align="center">awesome-planner-agent</h3>
  <p align="center">
    AI-assisted day planning, routine execution, and usage tracking in a single Next.js app.
  </p>
</div>

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#problem-space--project-context">Problem Space / Project Context</a></li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#api-overview">API Overview</a></li>
    <li><a href="#data-model-supabase">Data Model (Supabase)</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>

## About The Project

`awesome-planner-agent` 
1. converts natural-language plans into validated, calendar-aware schedules 
2. supports daily routine execution with completion tracking

Primary routes:
- `/`: day planner and calendar event creation
- `/morning`: morning routine CRUD + runner mode
- `/usage`: yearly/weekly completion visualization

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Problem Space / Project Context

Most personal planning tools either:
- force manual scheduling, or
- generate AI suggestions without grounding in user's planning knowledge

This project tackles that gap by combining:
- grab planning knowledge from Notion + check direct calendar conflict checks before creation,
- routine execution and longitudinal consistency tracking in one workflow.

Result: daily planning moves from intent ("I need to do X, Y, Z") to conflict-checked execution with measurable adherence.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Architecture

```text
src/
  app/
    api/
      plan/route.ts                 # Generate validated plan from text
      calendar/create/route.ts      # Re-check conflicts, create events
      auth/[...nextauth]/route.ts   # NextAuth handler
    page.tsx                        # Planner UI
    morning/page.tsx                # Routine UI + runner
    usage/page.tsx                  # Usage analytics UI
    providers.tsx                   # Session + store initialization wiring
  components/
    storeInitializer.tsx            # Centralized Zustand store bootstrap
    weekBar.tsx                     # Shared Monday-start week UI
    ...                             # Planner/routine shared components
  lib/
    schemas.ts                      # Zod schemas (Plan, PlannedTask)
    env.ts                          # Environment validation/loading
    calendar.ts                     # Google Calendar integration helpers
    google.ts                       # OAuth/Google client helpers
    notion.ts                       # Optional Notion rule retrieval
    usage-store.ts                  # Planner usage state (Zustand)
    morning-routine-store.ts        # Routine state/completion (Zustand)
    week.ts                         # Monday-based week utilities
  auth.ts                           # NextAuth config + token refresh
supabase/migrations/                # Schema migrations
```

Interaction flow:
1. Client calls `POST /api/plan` with `{ text, timeZone }`.
2. API fetches Google Calendar busy windows and optional Notion rules.
3. OpenAI returns structured JSON; server validates with Zod.
4. Client previews/edits plan.
5. Client calls `POST /api/calendar/create`.
6. Server re-checks conflicts and creates events.
7. Usage/routine completion data is written to Supabase.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Google Cloud project with Calendar API enabled
- (Optional) Supabase project
- (Optional) Notion integration + page

### Installation

1. Clone the repository.
   ```sh
   git clone git@github.com:awesome548/awesome-planner-agent.git
   cd awesome-planner-agent
   ```
2. Install dependencies.
   ```sh
   npm install
   ```
3. Create `.env.local` in project root.
   ```bash
   OPENAI_API_KEY=

   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_API_KEY=
   GOOGLE_REDIRECT_URI=

   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=

   NOTION_API_KEY=
   NOTION_PAGE_ID=
   ```
4. Start development server.
   ```sh
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000).

Available scripts:
- `npm run dev` - start local dev server
- `npm run build` - build for production
- `npm run start` - start production server
- `npm run lint` - run ESLint

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

1. Sign in with Google.
2. On `/`, enter natural-language tasks and generate a plan.
3. Review/edit generated tasks, then create calendar events.
4. On `/morning`, define routine actions and run them in sequence.
5. On `/usage`, inspect yearly streaks and weekly completion bars.

Notes:
- Weekly metrics are Monday-start and target `6` completion days.
- Store initialization is centralized so data is available from any route.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## API Overview

- `POST /api/plan`
  - Validates request and environment
  - Fetches calendar context + optional Notion rules
  - Generates and validates `PlanSchema` response
- `POST /api/calendar/create`
  - Re-validates conflicts
  - Creates Google Calendar events sequentially
- `GET/POST /api/auth/[...nextauth]`
  - NextAuth OAuth/session endpoints

API response convention:
- `{ ok: boolean, error?: string, ... }`

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Data Model (Supabase)

Tables defined by migrations in `supabase/migrations/`:
- `usage_records` (`used_on` date PK)
- `morning_routine_actions` (uuid PK, `title`, `position`)
- `morning_routine_completions` (`completed_on` date PK, `completed`)
- `morning_routine_action_records` (uuid PK, FK to action, unique `(action_id, completed_on)`)

RLS is enabled. Policies currently allow public read/write for single-user deployment.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS -->
[issues-shield]: https://img.shields.io/github/issues/awesome548/awesome-planner-agent.svg?style=for-the-badge
[issues-url]: https://github.com/awesome548/awesome-planner-agent/issues
[stars-shield]: https://img.shields.io/github/stars/awesome548/awesome-planner-agent.svg?style=for-the-badge
[stars-url]: https://github.com/awesome548/awesome-planner-agent/stargazers
[forks-shield]: https://img.shields.io/github/forks/awesome548/awesome-planner-agent.svg?style=for-the-badge
[forks-url]: https://github.com/awesome548/awesome-planner-agent/network/members
[contributors-shield]: https://img.shields.io/github/contributors/awesome548/awesome-planner-agent.svg?style=for-the-badge
[contributors-url]: https://github.com/awesome548/awesome-planner-agent/graphs/contributors
