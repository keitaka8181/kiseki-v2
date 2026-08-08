'use client';

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfXPt1yca5nZY26U4hsEinVi0WsFPqheEV-ed_TiX7KtzGp-g/viewform?usp=header';

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

      {/* Right: のこす button */}
      <a
        href={FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto bg-white text-gray-700 font-bold text-sm px-4 py-2 rounded-full shadow hover:bg-red-50 transition-colors"
      >
        のこす
      </a>
    </header>
  );
}
