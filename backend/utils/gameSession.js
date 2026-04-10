const { players, Player } = require("./player");
const question = require("./question");
const { formatResponse } = require("./responseFormatter");
const Timer = require("./timer");

class GameSession {
  constructor({ io }) {
    this.players = players;
    this.question = question.question;
    this.answer = question.answer;
    this.timer = new Timer({ gameSession: this });
    this.status = "LOBBY"; // LOBBY, PLAYING, ENDED, CLOSED
    this.gameMaster = null;
    this.pendingGM = null;
    this.messages = [];
    this.winner = null;
    this.socket = io;
    this.timeLeft = this.timer.secondsLeft();
    this.reason = null;
    this.declinedGMs = new Set();
  }

  getGameState(timeLeft = this.timeLeft) {
    const { socket, timer, players, ...rest } = this;
    return formatResponse({
      ...rest,
      players: this.players.getPlayers(),
      timeLeft: timeLeft,
    });
  }

  joinGame(id, name, socket) {
    if (!id || !name?.trim()) {
      socket.emit("join_error", "Player name is required");
      return;
    }

    if (this.players.checkUsernameExists(name)) {
      socket.emit("join_error", "Username already exists");
      return;
    }

    if (!this.gameMaster) {
      this.gameMaster = id;
    }

    const existingPlayer = this.players.players.find((p) => p.id === id);
    let response;
    if (this.status === "PLAYING") {
      if (existingPlayer) {
        existingPlayer.socket = socket; // Update socket reference for existing player
        response = this.players.resetPlayerPartially(id, name, false);
      } else {
        response = new Player().setSpectator({ id, name, socket });
      }
    } else {
      if (existingPlayer) {
        existingPlayer.socket = socket; // Update socket reference for existing player
        response = this.players.resetPlayerPartially(id, name, true);
      } else {
        response = new Player().setActivePlayer({ id, name, socket });
      }
    }

    if (!response.ok) {
      socket.emit(
        "join_error",
        response.error || "An error occurred while joining the game",
      );
    } else {
      socket.emit("init_player", response.data);
      this.socket.emit("sync_state", this.getGameState().data);
    }
  }

  startSession(q, a, socket) {
    this.reset();
    const response = question.setQuestionAndAnswer({
      question: q.trim(),
      answer: a.trim(),
    });
    if (!response.ok) {
      socket.emit("start_error", response.error);
      return;
    }

    this.question = response.data.question;
    this.answer = response.data.answer;

    this.status = "PLAYING";
    this.socket.emit("sync_state", this.getGameState().data);
    socket.emit(
      "init_player",
      this.players.getPlayer(socket.handshake.auth.sessionId).data,
    );
    this.timer.start();

    this.timer.onTimeExpired(() => {
      this.status = "ENDED";
      setTimeout(() => {
        this.assignGameMaster();
      }, 3000);

      this.socket.emit("sync_state", this.getGameState().data);
    });
  }

  onGuess(playerId, guess, socket) {
    const playerResponse = this.players.getPlayer(playerId);
    let response;
    if (!playerResponse.ok) {
      response = formatResponse(null, "Player not found");
      socket.emit("guess_error", response.error);
      return;
    }
    const player = playerResponse.data;

    if (player.spectating) {
      response = formatResponse(null, "Spectators cannot submit guesses");
      socket.emit("guess_error", response.error);
      return;
    }

    if (this.status !== "PLAYING") {
      response = formatResponse(null, "Game is not currently playing");
      socket.emit("guess_error", response.error);
      return;
    }

    const message = {
      userId: player.id,
      userName: player.name,
      text: guess,
    };
    this.messages.push(message);

    if (question.isAnswer(guess)) {
      this.players.incrementScore(playerId);
      this.winner = player;
      this.status = "ENDED";
      this.timer.stop();
      setTimeout(() => {
        this.assignGameMaster();
      }, 4500);
    } else {
      this.players.reduceAttempt(playerId);
    }

    this.socket.emit("sync_state", this.getGameState().data);
    socket.emit("init_player", this.players.getPlayer(playerId).data);
  }

  assignGameMaster() {
    const allPlayers = this.players.getPlayers();
    if (allPlayers.length === 0) return;

    // Filter players who haven't declined yet
    let available = allPlayers.filter(
      (p) => !this.declinedGMs.has(p.id) && p.id !== this.gameMaster,
    );

    // If everyone has declined, close the game
    if (available.length === 0) {
      this.status = "CLOSED";
      this.pendingGM = null;
      this.reason =
        "All players have declined to be Game Master. Game session is now closed.";
      this.socket.emit("sync_state", this.getGameState().data);
      setTimeout(() => {
        this.reset();
        this.gameMaster = null;
        this.players.clearPlayers();
        this.socket.emit("sync_state", this.getGameState().data);
      }, 5000);
      return;
    }

    const chosen = available[Math.floor(Math.random() * available.length)];
    this.pendingGM = chosen.id;
    this.declinedGMs.add(chosen.id);
    this.socket.emit("sync_state", this.getGameState().data);
  }

  onGMDecision(playerId, accept, socket) {
    if (this.pendingGM !== playerId) {
      socket.emit("gm_decision_error", "You are not the pending Game Master");
      return;
    }
    if (accept) {
      this.reset();
      this.gameMaster = playerId;
      this.declinedGMs.clear();
      this.socket.emit("sync_state", this.getGameState().data);
    } else {
      if (this.declinedGMs.size === this.players.getPlayers().length) {
        this.status = "CLOSED";
        this.pendingGM = null;
        this.reason =
          "All players have declined to be Game Master. Game session is now closed.";
        this.socket.emit("sync_state", this.getGameState().data);
        setTimeout(() => {
          this.reset();
          this.gameMaster = null;
          this.players.clearPlayers();
          this.socket.emit("sync_state", this.getGameState().data);
        }, 5000);
        return;
      }
      this.assignGameMaster();
    }
  }

  emitGameEvent({ message, eventName }) {
    this.socket.emit(eventName, message);
  }

  leaveGame(id) {
    if (players.getPlayers().length === 1) {
      this.reset();
      this.gameMaster = null;
      this.players.clearPlayers();
      this.socket.emit("sync_state", this.getGameState().data);
      return;
    }
    if (id === this.gameMaster && this.players.getPlayers().length > 1) {
      this.declinedGMs.clear();
      this.assignGameMaster();
      this.emitGameEvent({
        message: "Game Master has left, Assigning new Game Master...",
        eventName: "left_game_master",
      });
    } else if (
      id === this.gameMaster &&
      this.players.getPlayers().length === 1
    ) {
      this.status = "CLOSED";
      this.reason = "Game Master has left and no other players are available.";
      this.socket.emit("sync_state", this.getGameState().data);
      setTimeout(() => {
        this.reset();
        this.gameMaster = null;
        this.players.clearPlayers();
        this.socket.emit("sync_state", this.getGameState().data);
      }, 5000);
    }
    this.players.removePlayer(id);
    this.socket.emit("sync_state", this.getGameState().data);
  }

  reset() {
    this.question = null;
    this.answer = null;
    this.timer.stop();
    this.status = "LOBBY"; // LOBBY, PLAYING, ENDED, CLOSED
    this.pendingGM = null;
    this.messages = [];
    this.winner = null;
    this.timeLeft = 60;
    this.players.resetPlayers();
  }
}

module.exports = GameSession;
