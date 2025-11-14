"use client";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-neutral-800/40 bg-linear-to-b from-transparent to-black/5">
      <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            <span className="text-white">Reddit Topic</span>{" "}
            <span className="text-primary">Radar</span>
          </h1>
          <p className="text-xs text-neutral-400">Discover & analyze live trending topics on Reddit</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-sm text-neutral-200">Refresh</button>
        </div>
      </div>
    </nav>
  );
}
