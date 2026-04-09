// components/LoadingScreen.js
export default function LoadingScreen() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
      {/* Animated Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>

      <h2 className="mt-8 text-xl font-bold text-gray-800 animate-pulse">
        Connecting to Game...
      </h2>
      <p className="text-sm text-gray-400 mt-2">Resuming your session</p>
    </div>
  );
}
