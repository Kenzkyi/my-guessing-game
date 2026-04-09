"use client";
import { useGame } from "../context/GameContext";
import EntryScreen from "../components/EntryScreen";
import LobbyView from "../components/LobbyView";
import ActiveChat from "../components/ActiveChat";
import ResultsView from "@/components/ResultsView";
import PromotionModal from "@/components/PromotionModal";
import LoadingScreen from "@/components/LoadingScreen";

export default function Home() {
  const { gameState, me, leaveGame, isConnecting } = useGame();

  if (isConnecting) return <LoadingScreen />;

  if (!me) return <EntryScreen />;

  return (
    <>
      <div className="relative min-h-screen bg-gray-100">
        {/* Persistent Leave Button - Visible on all game states */}
        <button
          onClick={() => {
            if (confirm("Leave game?")) leaveGame();
          }}
          className="fixed bottom-6 right-6 z-[70] w-10 h-10 bg-black/10 hover:bg-red-500/20 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all active:scale-90 cursor-pointer"
          title="Leave Game"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444" // Tailwind red-500
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-6 h-6"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <PromotionModal /> {/* Always watching for the 'pendingGM' flag */}
        {gameState?.status === "LOBBY" && <LobbyView />}
        {gameState?.status === "PLAYING" && <ActiveChat />}
        {gameState?.status === "ENDED" && <ResultsView />}
        {/* Fallback for when the room is closed */}
        {gameState?.status === "CLOSED" && (
          <div className="h-screen flex items-center justify-center text-center p-10">
            <h1 className="text-xl font-bold text-red-500">
              {gameState.reason}
            </h1>
          </div>
        )}
      </div>
    </>
  );
}
