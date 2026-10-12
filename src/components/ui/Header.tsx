'use client';

interface Props {
  onLogoClick: () => void;
  onMenuClick: () => void;
}

export default function Header({ onLogoClick, onMenuClick }: Props) {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 pointer-events-none">
      {/* Left: hamburger */}
      <button
        onClick={onMenuClick}
        className="pointer-events-auto flex flex-col gap-1.5 p-2 bg-white rounded-lg shadow"
        aria-label="メニューを開く"
      >
        <span className="block w-5 h-0.5 bg-gray-700 rounded" />
        <span className="block w-5 h-0.5 bg-gray-700 rounded" />
        <span className="block w-5 h-0.5 bg-gray-700 rounded" />
      </button>

      {/* Center: logo */}
      <button
        onClick={onLogoClick}
        className="pointer-events-auto text-3xl font-bold tracking-widest font-serif drop-shadow"
      >
        <span className="text-red-500">キ</span>
        <span className="text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">セ</span>
        <span className="text-blue-400">キ</span>
      </button>

      {/* Right: spacer (same width as hamburger) to keep logo centered */}
      <div className="w-9" aria-hidden="true" />
    </header>
  );
}
