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
    this.declinedGMs.clear();
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

    // 1. Find everyone who hasn't been asked/declined yet
    // We exclude the current GM only if there's someone else available
    let available = allPlayers.filter((p) => !this.declinedGMs.has(p.id));

    if (allPlayers.length > 1) {
      available = available.filter((p) => p.id !== this.gameMaster);
    }

    // 2. No one left to ask
    if (available.length === 0) {
      // Instead of CLOSING, maybe just reset the declined list and pick someone?
      // Or keep your CLOSED logic if that's the intended game design.
      this.handleGameClosure();
      return;
    }

    // 3. Selection
    const chosen = available[Math.floor(Math.random() * available.length)];
    this.pendingGM = chosen.id;

    // Note: I moved .add() to the onGMDecision 'false' branch
    // to keep this function "pure" for selection only.

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
      this.declinedGMs.clear(); // Fresh start for the new GM's round
      this.socket.emit("sync_state", this.getGameState().data);
    } else {
      // 1. Add them to the declined list first
      this.declinedGMs.add(playerId);

      // 2. NOW check if everyone has declined
      // We compare against the total number of players currently in the session
      const totalPlayers = this.players.getPlayers().length;

      if (this.declinedGMs.size >= totalPlayers) {
        this.handleGameClosure();
        return;
      }

      // 3. Otherwise, find the next candidate
      this.assignGameMaster();
    }
  }

  emitGameEvent({ message, eventName }) {
    this.socket.emit(eventName, message);
  }

  leaveGame(id) {
    // 1. Remove the player first so logic calculations are accurate
    this.players.removePlayer(id);
    const currentPlayers = this.players.getPlayers();

    // 2. Check if room is empty
    if (currentPlayers.length === 0) {
      this.handleGameClosure("Room is empty.");
      return;
    }

    // 3. If the person who left was the Pending GM, pick a new one
    if (id === this.pendingGM) {
      this.assignGameMaster();
    }

    // 4. If the person who left was the active Game Master
    if (id === this.gameMaster) {
      this.declinedGMs.clear();
      // Reset gameMaster so the pick logic knows the seat is vacant
      this.gameMaster = null;
      this.assignGameMaster();
      this.emitGameEvent({
        message: "Game Master has left, assigning new Game Master...",
        eventName: "left_game_master",
      });
    }

    // 5. Always sync the final count to everyone
    this.socket.emit("sync_state", this.getGameState().data);
  }

  handleGameClosure(reason) {
    this.status = "CLOSED";
    this.reason = reason || "All players declined to be Game Master.";
    this.socket.emit("sync_state", this.getGameState().data);
    setTimeout(() => {
      this.reset();
      this.gameMaster = null;
      this.players.clearPlayers();
      this.socket.emit("sync_state", this.getGameState().data);
    }, 5000);
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
