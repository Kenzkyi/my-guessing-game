require("dotenv").config();
const express = require("express");
const app = express();

const http = require("http");

const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3012;

const GameSession = require("./utils/gameSession");

const gameSession = new GameSession({ io });

io.on("connection", (socket) => {
  const sessionId = socket.handshake.auth.sessionId;

  const player = gameSession.players.players.find((p) => p.id === sessionId);
  if (player) {
    player.socket = socket;

    // Send them their current data
    const { socket: _, ...data } = player; // Exclude socket from response
    socket.emit("init_player", data);
  } else {
    socket.emit("init_player", null); // No player data, treat as new connection
  }

  io.emit("sync_state", gameSession.getGameState().data);

  socket.on("join_game", (name) => {
    gameSession.joinGame(sessionId, name, socket);
  });

  socket.on("start_session", ({ q, a }) => {
    gameSession.startSession(q, a, socket);
  });

  socket.on("submit_guess", (guess) => {
    gameSession.onGuess(sessionId, guess, socket);
  });

  socket.on("gm_decision", (decision) => {
    gameSession.onGMDecision(sessionId, decision.accept, socket);
  });

  socket.on("leave_game", () => {
    gameSession.leaveGame(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
