# Database Restoration Guide

**Status:** The native SQLite database is currently **UNPLUGGED** so the user can test the UI in Expo Go without the Mac Mini.

## What was modified:
1. `apps/mobile/package.json`: Removed `@op-engineering/op-sqlite`, `@powersync/react-native`, and `expo-dev-client`.
2. `apps/mobile/src/lib/powersync.ts`: Replaced the native initialization with a mocked empty object (`export const powersync = {} as any;`).

## How to restore (When the user is ready):
Because the project uses Git, the original code is safely stored in the commit history. 
To plug the database back in, the AI agent simply needs to run:

```bash
git restore apps/mobile/package.json
git restore apps/mobile/src/lib/powersync.ts
npm install --workspace=@app/mobile
```
This will instantly pull the original code from our Git history and put the native "engine" back into the app.
