// components/PromotionModal.js
import { useGame } from "../context/GameContext";

export default function PromotionModal() {
  const { gameState, me, socket } = useGame();

  // Only show this if the server has flagged THIS specific player as the "Candidate"
  if (gameState?.pendingGM !== me.id) {
    return null;
  }

  const handleDecision = (accept) => {
    // Send the decision back to Express
    socket.emit("gm_decision", { accept });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center space-y-6 transform animate-in zoom-in duration-300">
        <div className="text-6xl animate-bounce">👑</div>
        <div>
          <h2 className="text-2xl font-black text-gray-800">It's Your Turn!</h2>
          <p className="text-gray-500 mt-2">
            The group needs a new Game Master. Do you want to lead the next
            round?
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleDecision(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            Yes, I'll do it! ✍️
          </button>
          <button
            onClick={() => handleDecision(false)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-3 rounded-2xl transition-all"
          >
            Pass to someone else
          </button>
        </div>
      </div>
    </div>
  );
}
