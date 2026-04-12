const {
  formatResponse,
  capitalizeFirstLetter,
} = require("./responseFormatter");

class Player {
  constructor() {
    this.name = null;
    this.id = null;
    this.attempts = 3;
    this.score = 0;
    this.spectating = false;
    this.activeInRound = true;
    this.socket = null;
    this.updatedAt = Date.now();
  }

  setActivePlayer(arg0) {
    if (!arg0.name?.trim())
      return formatResponse(null, "Player name is required");
    this.name = capitalizeFirstLetter(arg0.name?.trim());
    this.id = arg0.id;
    this.socket = arg0.socket;
    this.spectating = false;
    this.activeInRound = true;
    players.addPlayer({ ...this });
    const { socket, ...playerData } = this; // Exclude socket from response
    return formatResponse(playerData);
  }

  setSpectator(arg0) {
    if (!arg0.name?.trim())
      return formatResponse(null, "Player name is required");
    this.name = capitalizeFirstLetter(arg0.name?.trim());
    this.id = arg0.id;
    this.socket = arg0.socket;
    this.spectating = true;
    this.activeInRound = false;
    players.addPlayer({ ...this }); // Always copy the object
    const { socket, ...playerData } = this; // Exclude socket from response
    return formatResponse(playerData);
  }
}

class Players {
  constructor() {
    this.players = [];
  }

  getPlayers() {
    return this.players.map(({ socket, ...playerData }) => playerData); // Exclude sockets from all players
  }

  getPlayer(id) {
    const player = this.players.find((p) => p.id === id);

    const { socket, ...playerData } = player || {}; // Exclude socket from response
    return player
      ? formatResponse(playerData)
      : formatResponse(null, "Player not found");
  }

  addPlayer(player) {
    this.players.push(player);
  }

  removePlayer(id) {
    this.players = this.players.filter((p) => p.id !== id);
  }

  checkUsernameExists(name) {
    return this.players.some(
      (p) => p.name?.toLowerCase() === name.toLowerCase(),
    );
  }

  // UPDATED: No more filter/concat (keeps order stable)
  reduceAttempt(id) {
    const player = this.players.find((p) => p.id === id);
    if (player && player.attempts > 0) player.attempts -= 1;
  }

  incrementScore(id) {
    const player = this.players.find((p) => p.id === id);
    if (player) player.score += 10;
  }

  resetPlayerPartially(id, name, active) {
    const player = this.players.find((p) => p.id === id);
    if (!player) return formatResponse(null, "Player not found");

    player.name = capitalizeFirstLetter(name?.trim() || player.name);
    player.activeInRound = active ?? player.activeInRound;
    player.spectating = !player.activeInRound;
    player.attempts = 3; // Reset attempts on partial join

    return formatResponse(player);
  }

  resetPlayers() {
    this.players.forEach((player) => {
      player.attempts = 3;
      player.activeInRound = true;
      player.spectating = false;

      if (player.socket && player.socket.connected) {
        const { socket, ...playerData } = player; // Strip socket before emitting
        player.socket.emit("init_player", playerData);
      }
    });
  }

  clearPlayers() {
    this.players.forEach((player) => {
      player.socket.emit("init_player", null); // Notify all players of reset
    });
    this.players = [];
  }
}

const players = new Players();
module.exports = { Player, players };
