# Realtime Leaderboard (Simple)

No backend and no API call.

How it works:

- Saves attempts in `localStorage`
- Syncs instantly between opened tabs using `BroadcastChannel`
- Also syncs via `storage` event

This means:

- Stable and no API errors
- Realtime on the same browser/device tabs
