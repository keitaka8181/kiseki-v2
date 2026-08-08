'use client';

interface Props {
  years: string[];
  activeYear: string | null;
  onSelect: (year: string | null) => void;
}

export default function TimelineControls({ years, activeYear, onSelect }: Props) {
  if (years.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-2">
        <button
          onClick={() => onSelect(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            activeYear === null ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          全て
        </button>
        {years.map((y) => (
          <button
            key={y}
            onClick={() => onSelect(activeYear === y ? null : y)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeYear === y ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {y}
          </button>
        ))}
      </div>
    </div>
  );
}
