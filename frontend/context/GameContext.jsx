"use client";
import {
  initAudio,
  loadSound,
  playSound,
  resumeAudio,
} from "@/utils/audioManager";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState(null);
  const [me, setMe] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [hasPlayedSound, setHasPlayedSound] = useState(false); // New state to track if sound has been played

  // 1. Memoize socket to prevent re-initialization on every render
  const socket = useMemo(() => {
    const getSessionId = () => {
      if (typeof window === "undefined") return null;
      let sessionId = localStorage.getItem("game_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("game_session_id", sessionId);
      }
      return sessionId;
    };

    return io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3012", {
      auth: { sessionId: getSessionId() },
      reconnectionAttempts: 5, // Try to reconnect up to 5 times
      transports: ["websocket", "polling"], // Prioritize WebSocket but allow polling as fallback
    });
  }, []);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected");
      const engine = socket.io.engine;
      console.log(engine.transport.name); // in most cases, prints "polling"

      engine.once("upgrade", () => {
        // called when the transport is upgraded (i.e. from HTTP long-polling to WebSocket)
        console.log(engine.transport.name); // in most cases, prints "websocket"
      });
    });

    socket.on("sync_state", (state) => {
      setGameState(state);
      setIsConnecting(false);
    });

    socket.on("init_player", (player) => {
      setMe(player || null); // For reconnection persistence
      setIsConnecting(false);
    });

    socket.on("join_error", (message) => toast.error(message));

    socket.on("connect_error", () => {
      toast.error("Server connection failed, please try again.");
      setMe(null);
      setIsConnecting(false);
    });

    socket.on("start_error", (message) => toast.error(message));

    socket.on("guess_error", (message) => toast.error(message));

    socket.on("gm_decision_error", (message) => toast.error(message));

    socket.on("left_game_master", (message) => {
      if (me) {
        toast.info(message);
      }
    });

    // 3. CLEANUP: This is vital to prevent memory leaks and duplicate toasts
    return () => {
      socket.off("connect");
      socket.off("sync_state");
      socket.off("join_success");
      socket.off("init_player");
      socket.off("join_game_error");
      socket.off("connect_error");
      socket.off("start_error");
      socket.off("guess_error");
      socket.off("gm_decision_error");
    };
  }, [socket]); // Only runs once when socket is created

  useEffect(() => {
    (async () => {
      try {
        await initAudio();
        await loadSound("tick", "/tick.mp3");
        await loadSound("success", "/success.mp3");
        await loadSound("alert", "/alert.mp3");
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  useEffect(() => {
    if (gameState?.status === "LOBBY") {
      setHasPlayedSound(false);
    }
  }, [gameState?.status]);

  useEffect(() => {
    if (!gameState) return;

    // Winner Sound
    if (gameState.winner && !gameState.pendingGM && !hasPlayedSound) {
      setHasPlayedSound(true);
      playSound("success", 4);
    }

    // GM Promotion Alert (Only play once when I become the pending GM)
    if (gameState.pendingGM === me?.id) {
      playSound("alert", 3.5);
    }
  }, [gameState?.winner, gameState?.pendingGM, me?.id]);

  const sendGuess = (text) => socket.emit("submit_guess", text);
  const joinGame = async (name) => {
    // 1. Unlock audio for the whole session
    try {
      await resumeAudio();
    } catch (err) {
      console.warn("Audio unlock failed", err);
    }
    socket.emit("join_game", name);
  };
  const startSession = (q, a) => socket.emit("start_session", { q, a });

  const leaveGame = () => {
    socket.emit("leave_game"); // Backend: Remove player from array/map
    setMe(null); // Frontend: Reset local state
    socket.disconnect(); // Disconnect socket to prevent lingering connections
    localStorage.removeItem("game_session_id");
    window.location.reload(); // Hard reset to ensure fresh socket connection
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        me,
        sendGuess,
        joinGame,
        startSession,
        socket,
        leaveGame,
        isConnecting,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);
