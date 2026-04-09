// components/GMSetup.js
import { useState } from "react";
import { useGame } from "../context/GameContext";

export default function GMSetup() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const { startSession } = useGame();

  const handleSubmit = (e) => {
    e.preventDefault();
    startSession(q.trim(), a.trim());
  };

  return (
    <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
      <h3 className="font-bold text-blue-800 mb-4">Create the Challenge</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          placeholder="Enter Question"
          className="w-full p-2 border rounded"
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          placeholder="Enter Answer"
          className="w-full p-2 border rounded"
          onChange={(e) => setA(e.target.value)}
        />
        <button
          className="w-full bg-green-600 cursor-pointer text-white py-2 rounded font-bold disabled:bg-gray-400 disabled:pointer-events-none hover:opacity-80 transition"
          disabled={!q || !a}
        >
          Start Game 🚀
        </button>
      </form>
    </div>
  );
}
