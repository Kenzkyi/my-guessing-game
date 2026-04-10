// components/ResultsView.js
import { useGame } from "../context/GameContext";

export default function ResultsView() {
  const { gameState, me } = useGame();

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center p-6">
      <h1 className="text-4xl mb-4 text-gray-600">
        {gameState.winner
          ? gameState.winner.id === me.id
            ? "You have won"
            : "🎉 We Have a Winner!"
          : "⏰ Time's Up!"}
      </h1>
      {gameState.winner && (
        <div className="bg-yellow-100 p-6 rounded-2xl mb-4">
          <p className="text-lg font-bold text-black">
            {gameState.winner?.id === me.id
              ? "Congratulations, you guessed it right! 🥳"
              : `${gameState.winner.name} won 10 points!`}
          </p>
        </div>
      )}
      {gameState.winner?.id !== me.id && (
        <p className="text-gray-600">
          The answer was: <span className="font-bold">{gameState.answer}</span>
        </p>
      )}
      <p className="mt-8 animate-bounce text-blue-500 text-sm">
        Preparing next round...
      </p>
    </div>
  );
}
