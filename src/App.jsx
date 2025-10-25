import React from "react";
import ReactVideoPlayerWithAnnotations from "./components/AnnotatedPlayer.jsx"

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <ReactVideoPlayerWithAnnotations />
    </div>
  );
}