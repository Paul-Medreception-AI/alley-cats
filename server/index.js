const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';
const ORIGIN = process.env.CLIENT_ORIGIN || '*';
const MAX_ROOM_SIZE = Number(process.env.MAX_ROOM_SIZE || 6);

const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ORIGIN,
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function listPlayers(room) {
  return Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    isHost: p.id === room.hostId
  }));
}

io.on('connection', (socket) => {
  socket.data.displayName = socket.handshake.auth?.name || `Player-${socket.id.slice(0, 4)}`;

  socket.on('host:createRoom', (payload = {}, ack = () => {}) => {
    const roomCode = (payload.roomCode || generateRoomCode()).toUpperCase();
    if (rooms.has(roomCode)) {
      return ack({ ok: false, error: 'ROOM_EXISTS' });
    }
    const room = {
      hostId: socket.id,
      players: new Map([[socket.id, { id: socket.id, name: socket.data.displayName }]])
    };
    rooms.set(roomCode, room);
    socket.join(roomCode);
    ack({ ok: true, roomCode, players: listPlayers(room) });
  });

  socket.on('player:joinRoom', ({ roomCode, name } = {}, ack = () => {}) => {
    if (!roomCode) return ack({ ok: false, error: 'ROOM_REQUIRED' });
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return ack({ ok: false, error: 'ROOM_NOT_FOUND' });
    if (room.players.size >= MAX_ROOM_SIZE) return ack({ ok: false, error: 'ROOM_FULL' });

    const displayName = name?.trim() || socket.data.displayName;
    socket.data.displayName = displayName;
    room.players.set(socket.id, { id: socket.id, name: displayName });
    socket.join(code);
    ack({ ok: true, roomCode: code, players: listPlayers(room) });
    io.to(code).emit('room:players', listPlayers(room));
  });

  socket.on('room:broadcast', ({ roomCode, type, payload } = {}) => {
    if (!roomCode || !type) return;
    const code = roomCode.toUpperCase();
    if (!rooms.has(code)) return;
    socket.to(code).emit('room:event', {
      from: socket.id,
      type,
      payload,
      ts: Date.now()
    });
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      if (!room.players.has(socket.id)) return;
      room.players.delete(socket.id);
      socket.leave(code);
      if (room.hostId === socket.id) {
        io.to(code).emit('room:closed');
        rooms.delete(code);
      } else {
        io.to(code).emit('room:players', listPlayers(room));
        if (room.players.size === 0) rooms.delete(code);
      }
    });
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Socket server listening on http://${HOST}:${PORT}`);
});
