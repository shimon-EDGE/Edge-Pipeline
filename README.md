# EDGE Pipeline System

Sales intelligence and outreach system for EDGE | Fractional Head of Video.

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later installed
- A [Supabase](https://supabase.com) project (already configured)
- A [Vercel](https://vercel.com) account (connected to GitHub)

### Step 1: Push to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name the repo `edge-pipeline` (keep it private)
3. Click "Create repository"
4. Follow GitHub's instructions to upload files, or use their web uploader

### Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `edge-pipeline` repo
4. Before clicking Deploy, add these **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` → your Supabase secret key
5. Click Deploy

### Step 3: Log In

Visit your Vercel deployment URL and sign in with the email/password you created in Supabase Auth.

## Project Structure

```
app/
  login/          → Login page
  dashboard/      → Command center with stats + outreach queue
  accounts/       → Account list + add form
  accounts/[id]/  → Account detail + contacts
  contacts/       → Contact list + add form
  messages/       → Outreach queue + message history
components/       → Shared UI components
lib/              → Supabase clients + TypeScript types
```

## Tech Stack

- **Next.js 14** — React framework
- **Supabase** — Database + Auth
- **Tailwind CSS** — Styling
- **Vercel** — Hosting + Serverless
