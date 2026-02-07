# awesome-planner-agent

A minimal planner that turns plain-language tasks into a daily schedule and can create Google Calendar events.

## Features
- Generate a structured plan from freeform text
- Preview and edit tasks before creating events
- Morning routine manager with runner mode
- Usage tracking for daily planning and routines
- Optional integrations with Google Calendar, Notion, and Supabase

## Tech
- Next.js App Router
- NextAuth (Google OAuth)
- OpenAI SDK
- Supabase (usage tracking)
- Tailwind CSS

## Setup
1) Install dependencies
```bash
npm install
```

Helpful Google setup links:

- [Google Cloud Console](https://console.cloud.google.com/)
- [Create/select a project](https://console.cloud.google.com/projectcreate)
- [APIs & Services Library](https://console.cloud.google.com/apis/library)
- [Credentials (OAuth client IDs + API keys)](https://console.cloud.google.com/apis/credentials)
- [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
- [Google Calendar API overview](https://developers.google.com/calendar/api)

2) Create `.env.local`
```bash
OPENAI_API_KEY=
NOTION_API_KEY=
NOTION_PAGE_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_API_KEY=
GOOGLE_REDIRECT_URI=
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
- `npm run lint` — lint

## License
MIT
