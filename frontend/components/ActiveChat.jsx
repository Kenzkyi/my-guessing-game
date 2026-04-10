// components/ActiveChat.js
import { useEffect, useState } from "react";
import { useGame } from "../context/GameContext";
import Scoreboard from "./ScoreBoard";
import { playSound } from "@/utils/audioManager";

export default function ActiveChat() {
  const { gameState, me, sendGuess } = useGame();

  const [text, setText] = useState("");
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);

  const isGM = me.id === gameState.gameMaster;
  const canGuess = !isGM && me.attempts > 0 && gameState.status === "PLAYING";

  useEffect(() => {
    if (
      gameState.timeLeft <= 10 &&
      gameState.timeLeft > 0 &&
      gameState.status === "PLAYING"
    ) {
      playSound("tick");
    }
  }, [gameState.timeLeft]);

  const handleSendMessage = () => {
    if (text.trim() && canGuess) {
      sendGuess(text);
      setText("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const isUrgent = gameState.timeLeft <= 10;

  const isSpectator = me.spectating || !me.activeInRound;

  return (
    <>
      <div className="w-full md:w-fit md:min-w-1/3 flex flex-col h-screen max-w-2xl mx-auto bg-gray-50 shadow-lg border-x">
        {/* 1. Header: Question & Timer */}
        <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white shadow-md w-full z-10">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest opacity-80">
              Current Question
            </p>
            <h2 className="font-bold text-lg leading-tight">
              {gameState.question}
            </h2>
          </div>
          <div
            className={`
    font-mono font-bold text-2xl ml-4  px-3 py-1 rounded-lg transition-all duration-300
    ${
      isUrgent
        ? "bg-red-600 text-white animate-pulse scale-110 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
        : "bg-white/20 text-white backdrop-blur-sm"
    }
  `}
          >
            {gameState.timeLeft}s
          </div>
        </div>
        {/* </div> */}

        {/* 2. Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {gameState.messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${msg.userId === me.id ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-gray-500 mb-1 px-2">
                {msg.userName}
              </span>
              <div
                className={`p-3 rounded-2xl max-w-[85%] shadow-sm ${
                  msg.userId === me.id
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white border text-gray-800 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Input Controller */}
        <div className="p-4 bg-white border-t sticky bottom-0">
          {isSpectator ? (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
              <p className="text-amber-700 font-medium text-sm">
                Round in progress! You are spectating. 🍿
              </p>
              <p className="text-xs text-amber-600 mt-1">
                You'll be added to the next round in {gameState.timeLeft}s
              </p>
            </div>
          ) : canGuess ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your guess here..."
                  className="flex-1 p-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-colors placeholder:text-gray-300 text-black"
                  autoFocus
                />
                <button
                  onClick={handleSendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold transition-all active:scale-95"
                >
                  Send
                </button>
              </div>
              <div className="flex justify-between items-center px-1">
                <p className="text-xs text-gray-500">
                  Remaining attempts:{" "}
                  <span className="font-bold text-blue-600">
                    {me.attempts}/3
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-sm text-gray-500 font-medium italic">
                {isGM
                  ? "📢 You are the GM. Monitoring player guesses..."
                  : "🔒 Out of attempts. You are spectating."}
              </p>
            </div>
          )}
          <button
            onClick={() => setIsScoreboardOpen(true)}
            className="flex mt-2 items-center gap-1 text-xs font-bold text-blue-600 cursor-pointer hover:underline"
          >
            🏆 View Live Scores
          </button>
        </div>
      </div>
      <Scoreboard
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
      />{" "}
      {/* Placeholder for Scoreboard modal */}
    </>
  );
}
