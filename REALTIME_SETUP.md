# Realtime Leaderboard on Vercel

No manual start is needed.

This project now uses a Vercel serverless route:

- [`/api/leaderboard`](./api/leaderboard.js)

The frontend auto-connects to this API on page load and polls every few seconds.

## Deploy

1. Push project to Vercel.
2. Open your deployed URL.
3. Leaderboard starts automatically.

## Important note

Current API storage is in-memory (serverless instance memory), so records can reset when instance restarts/redeploys.
If you want persistent leaderboard later, we can switch this API to Vercel KV/Postgres.
