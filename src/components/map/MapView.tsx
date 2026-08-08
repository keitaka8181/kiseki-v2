'use client';

import { useEffect, useRef } from 'react';
import { Memory } from '@/types';
import { BasemapLayer, DEFAULT_MAP_CENTER, JAPAN_FLY_IN } from '@/lib/basemaps';

let maplibregl: typeof import('maplibre-gl') | null = null;

interface Props {
  memories: Memory[];
  onMarkerClick: (memory: Memory) => void;
  flyToMemory?: Memory | null;
  activeBasemap: BasemapLayer;
}

const AVATAR_SIZE = 40;

export default function MapView({ memories, onMarkerClick, flyToMemory, activeBasemap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const memoriesRef = useRef(memories);
  const onMarkerClickRef = useRef(onMarkerClick);
  const pendingBasemapRef = useRef<BasemapLayer | null>(null);
  memoriesRef.current = memories;
  onMarkerClickRef.current = onMarkerClick;

  function refreshMarkers(
    map: import('maplibre-gl').Map,
    gl: typeof import('maplibre-gl'),
    data: Memory[]
  ) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    data.forEach((memory) => {
      if (
        !isFinite(memory.lat) || !isFinite(memory.lng) ||
        memory.lat < -90 || memory.lat > 90 ||
        memory.lng < -180 || memory.lng > 180
      ) return;

      const el = document.createElement('div');
      el.style.cssText = `
        width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;
        border-radius:50%;overflow:hidden;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        cursor:pointer;background:#eee;
      `;
      const img = document.createElement('img');
      img.src = `/images/avatars/${memory.avatar || 'boy'}.png`;
      img.alt = memory.nickname;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = () => { img.src = '/images/avatars/boy.png'; };
      el.appendChild(img);
      el.addEventListener('click', () => onMarkerClickRef.current(memory));

      const marker = new gl.Marker({ element: el })
        .setLngLat([memory.lng, memory.lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }

  // マップ初期化（マウント時1回のみ）
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    async function initMap() {
      maplibregl = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: activeBasemap.style as never,
        center: DEFAULT_MAP_CENTER,
        zoom: 2,
        pitch: 0,
        bearing: 0,
      });

      map.on('load', () => {
        if (cancelled) return;
        mapLoadedRef.current = true;
        mapRef.current = map;

        // 初期化完了前にベースマップが変更されていた場合は適用する
        if (pendingBasemapRef.current &&
            pendingBasemapRef.current.id !== activeBasemap.id) {
          map.setStyle(pendingBasemapRef.current.style as never);
          pendingBasemapRef.current = null;
          return; // style.load イベントで refreshMarkers が呼ばれる
        }
        pendingBasemapRef.current = null;

        setTimeout(() => {
          if (cancelled) return;
          map.flyTo({ ...JAPAN_FLY_IN, essential: true });
        }, 600);

        refreshMarkers(map, maplibregl!, memoriesRef.current);
      });

      // ベースマップ切替後にマーカーを再描画
      map.on('style.load', () => {
        if (!mapLoadedRef.current) return;
        refreshMarkers(map, maplibregl!, memoriesRef.current);
      });
    }

    initMap();

    return () => {
      cancelled = true;
      mapLoadedRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ベースマップ切替
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current) {
      pendingBasemapRef.current = activeBasemap;
      return;
    }
    pendingBasemapRef.current = null;
    mapRef.current.setStyle(activeBasemap.style as never);
  }, [activeBasemap]);

  // データ変更時にマーカー更新
  useEffect(() => {
    if (!mapRef.current || !mapLoadedRef.current || !maplibregl) return;
    refreshMarkers(mapRef.current, maplibregl, memories);
  }, [memories]);

  // 思い出選択時にフライ
  useEffect(() => {
    if (!flyToMemory || !mapRef.current || !mapLoadedRef.current) return;
    mapRef.current.flyTo({
      center: [flyToMemory.lng, flyToMemory.lat],
      zoom: 15,
      pitch: 45,
      duration: 1200,
    });
  }, [flyToMemory]);

  /*
   * absolute + inset-0 + z-index:0 が重要:
   *   - 親(MapExplorer)が position:relative + 明示サイズなので
   *     MapLibre が clientWidth/clientHeight を正しく読める
   *   - z-index:0 に留まることで z-index:10以上のUI overlayが必ず手前に来る
   */
  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
    />
  );
}
