# awesome-planner-agent

A minimal planner that turns plain-language tasks into a daily schedule and can create Google Calendar events.

## Features
- Generate a structured plan from freeform text
- Preview and edit tasks before creating events
- Optional integrations with Google Calendar, Notion, and Supabase

## Tech
- Next.js App Router
- NextAuth (Google OAuth)
- OpenAI SDK
- Supabase (usage tracking)

## Setup
1) Install dependencies
```bash
npm install
```

2) Create `.env.local`
```bash
OPENAI_API_KEY=
NOTION_API_KEY=
NOTION_PAGE_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

3) Run locally
```bash
npm run dev
```

Open http://localhost:3000.

## Scripts
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — lint

## License
MIT
