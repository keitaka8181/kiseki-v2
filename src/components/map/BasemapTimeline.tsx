'use client';

import { BASEMAP_LAYERS, BasemapLayer } from '@/lib/basemaps';

interface Props {
  activeId: string;
  onChange: (layer: BasemapLayer) => void;
}

export default function BasemapTimeline({ activeId, onChange }: Props) {
  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
      <div className="flex items-center bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
        {BASEMAP_LAYERS.map((layer, i) => {
          const isActive = layer.id === activeId;
          const isLast = i === BASEMAP_LAYERS.length - 1;
          return (
            <div key={layer.id} className="flex items-center">
              <button
                title={layer.note ?? layer.name}
                onClick={() => onChange(layer)}
                className="flex flex-col items-center gap-1 px-2 group"
              >
                <div className={[
                  'w-3 h-3 rounded-full border-2 transition-all duration-200',
                  isActive
                    ? 'bg-white border-white scale-125'
                    : 'bg-transparent border-white/60 group-hover:border-white group-hover:scale-110',
                ].join(' ')} />
                <span className={[
                  'text-[10px] font-medium transition-colors duration-200 whitespace-nowrap',
                  isActive ? 'text-white' : 'text-white/60 group-hover:text-white',
                ].join(' ')}>
                  {layer.name}
                </span>
              </button>
              {!isLast && <div className="w-5 h-px bg-white/30 mb-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
