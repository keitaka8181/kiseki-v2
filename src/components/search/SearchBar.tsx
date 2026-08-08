'use client';

interface Props {
  value: string;
  onChange: (term: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white rounded-full shadow-lg px-4 py-2 w-[min(90vw,360px)]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ width: 20, height: 20, flexShrink: 0, color: '#9ca3af' }}
      >
        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        <path d="M0 0h24v24H0z" fill="none" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="場所・思い出を検索…"
        className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
