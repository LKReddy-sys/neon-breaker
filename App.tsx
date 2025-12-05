import React from 'react';
import GameCanvas from './components/GameCanvas';
import Navbar from './components/Navbar';

function App() {
  return (
    <div className="w-full h-screen flex flex-col bg-black overflow-hidden">
      <Navbar />
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        <GameCanvas />
      </div>
    </div>
  );
}

export default App;