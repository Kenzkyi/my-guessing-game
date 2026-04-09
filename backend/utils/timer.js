const DEFAULT_TIMER = 60;

class Timer {
  constructor({ gameSession }) {
    this.seconds = 0;
    this.intervalId = null;
    this._onTimeExpired = () => null;
    this.gameSession = gameSession;
  }

  start() {
    this.stop(); // CRITICAL: Stop any existing timers before starting a new one
    this.seconds = 0;

    this.intervalId = setInterval(() => {
      this.seconds += 1;
      const timeLeft = this.secondsLeft();

      this.gameSession.timeLeft = timeLeft;

      // Update everyone on the new clock time
      this.gameSession.socket.emit(
        "sync_state",
        this.gameSession.getGameState(timeLeft).data,
      );

      if (this.seconds >= DEFAULT_TIMER) {
        this.stop();
        if (this._onTimeExpired) this._onTimeExpired(this.gameSession);
      }
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  secondsLeft() {
    return Math.max(0, DEFAULT_TIMER - this.seconds);
  }

  onTimeExpired(fn) {
    this._onTimeExpired = fn;
  }
}

module.exports = Timer;
