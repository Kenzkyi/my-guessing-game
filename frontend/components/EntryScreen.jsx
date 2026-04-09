// components/EntryScreen.js
import { useState } from "react";
import { useGame } from "../context/GameContext";

export default function EntryScreen() {
  const [name, setName] = useState("");
  const { joinGame } = useGame();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) joinGame(name);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-blue-600 mb-6">
          Guessing Game 🎮
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Enter your nickname (15 chars max)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border text-black rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-300"
            maxLength={15}
            autoFocus
          />
          <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
}
