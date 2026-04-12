// components/LobbyView.js
import { useGame } from "../context/GameContext";
import GMSetup from "./GMSetup";

export default function LobbyView() {
  const { gameState, me } = useGame();
  const isGM = me.id === gameState.gameMaster;
  const canStart = gameState.players.length >= 3;

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <div className="flex flex-col items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Game Lobby 🏠</h2>
        {/* ADDED: Player Count Badge */}
        <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1">
          👥 {gameState.players.length} Players Connected
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <ul className="space-y-2">
          {gameState.players.map((p) => (
            <li
              key={p.id}
              className="flex justify-between items-center bg-gray-50 p-2 rounded"
            >
              <span className="text-gray-500">
                {p.name} {p.id === me.id && "(You)"}
              </span>
              {p.id === gameState.gameMaster && (
                <span className="text-xl text-gray-500">👑</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isGM ? (
        canStart ? (
          <GMSetup />
        ) : (
          <p className="text-orange-600 font-medium animate-pulse">
            Waiting for more players to join (Min. 3)
          </p>
        )
      ) : (
        <p className="text-blue-600">
          Waiting for the Game Master to start... ⏳
        </p>
      )}
    </div>
  );
}
