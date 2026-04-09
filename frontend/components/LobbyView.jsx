// components/LobbyView.js
import { useGame } from "../context/GameContext";
import GMSetup from "./GMSetup";

export default function LobbyView() {
  const { gameState, me } = useGame();
  const isGM = me.id === gameState.gameMaster;
  const canStart = gameState.players.length >= 3;

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Game Lobby 🏠</h2>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h3 className="font-semibold text-gray-500 uppercase text-xs mb-4">
          Players Connected
        </h3>
        <ul className="space-y-2">
          {gameState.players.map((p) => (
            <li
              key={p.id}
              className="flex justify-between items-center bg-gray-50 p-2 rounded"
            >
              <span>
                {p.name} {p.id === me.id && "(You)"}
              </span>
              {p.id === gameState.gameMaster && (
                <span className="text-xl">👑</span>
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
