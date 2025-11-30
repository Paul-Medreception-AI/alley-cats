# Alley Cats Multiplayer Server

Simple Express + Socket.IO relay that manages room creation and player joins.

## Running locally

```bash
cd server
npm install # already done once
npm run dev
```

The server listens on `http://localhost:4000` by default. Front-end clients can connect via Socket.IO and emit:

- `host:createRoom` (optionally `{ roomCode }`) to create a lobby.
- `player:joinRoom` with `{ roomCode, name }` to join an existing lobby.
- `room:broadcast` with `{ roomCode, type, payload }` to relay custom in-game events to other clients.

Use `GET /health` to sanity-check the server is running.
