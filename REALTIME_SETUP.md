# Global Realtime Leaderboard (Vercel)

This project uses [`/api/leaderboard`](./api/leaderboard.js).

To make leaderboard global across devices, add Vercel KV (Upstash Redis) env vars:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## Steps

1. In Vercel dashboard, add **KV** (Upstash integration) to this project.
2. Confirm environment variables are available in the project.
3. Redeploy.

After deploy:

- Status becomes `Realtime: global leaderboard connected`
- All devices see shared leaderboard updates

If KV is missing/unavailable, app auto-falls back to local mode (no crash, no API popup errors).
