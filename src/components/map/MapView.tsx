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
  /** 地図の右クリック（タッチ端末では長押し）で呼ばれる */
  onMapContextMenu?: (pos: { lat: number; lng: number }) => void;
  /** 投稿中の仮ピン位置。null なら非表示 */
  draftLocation?: { lat: number; lng: number } | null;
}

const AVATAR_SIZE = 40;
const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE = 10; // px

export default function MapView({
  memories, onMarkerClick, flyToMemory, activeBasemap, onMapContextMenu, draftLocation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  const mapLoadedRef = useRef(false);
  const memoriesRef = useRef(memories);
  const onMarkerClickRef = useRef(onMarkerClick);
  const pendingBasemapRef = useRef<BasemapLayer | null>(null);
  const onMapContextMenuRef = useRef(onMapContextMenu);
  const draftMarkerRef = useRef<import('maplibre-gl').Marker | null>(null);
  memoriesRef.current = memories;
  onMarkerClickRef.current = onMarkerClick;
  onMapContextMenuRef.current = onMapContextMenu;

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

      // 右クリックで思い出を追加
      // (右ドラッグで回転した場合は MapLibre 側で contextmenu が抑止される)
      map.on('contextmenu', (e) => {
        e.originalEvent.preventDefault();
        onMapContextMenuRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });

      // タッチ端末: 1本指の長押しで同じ動作 (iOS Safari は contextmenu を発火しないため)
      const canvas = map.getCanvasContainer();
      let pressTimer: ReturnType<typeof setTimeout> | null = null;
      let pressStart: { x: number; y: number } | null = null;
      let longPressFired = false;
      const cancelPress = () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
        pressStart = null;
      };
      canvas.addEventListener('touchstart', (ev) => {
        cancelPress();
        longPressFired = false;
        if (ev.touches.length !== 1) return;
        const t = ev.touches[0];
        pressStart = { x: t.clientX, y: t.clientY };
        pressTimer = setTimeout(() => {
          if (!pressStart) return;
          const rect = canvas.getBoundingClientRect();
          const lngLat = map.unproject([pressStart.x - rect.left, pressStart.y - rect.top]);
          cancelPress();
          longPressFired = true;
          onMapContextMenuRef.current?.({ lat: lngLat.lat, lng: lngLat.lng });
        }, LONG_PRESS_MS);
      }, { passive: true });
      canvas.addEventListener('touchmove', (ev) => {
        if (!pressStart) return;
        const t = ev.touches[0];
        if (ev.touches.length !== 1 ||
            Math.hypot(t.clientX - pressStart.x, t.clientY - pressStart.y) > LONG_PRESS_MOVE_TOLERANCE) {
          cancelPress();
        }
      }, { passive: true });
      canvas.addEventListener('touchend', (ev) => {
        cancelPress();
        // 指を離したときの合成クリックが、開いたフォームの入力欄などを押さないようにする
        if (longPressFired) {
          ev.preventDefault();
          longPressFired = false;
        }
      }, { passive: false });
      canvas.addEventListener('touchcancel', cancelPress);

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
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
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

  // 投稿中の仮ピン
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !maplibregl) return;
    if (!draftLocation) {
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = null;
      return;
    }
    const lngLat: [number, number] = [draftLocation.lng, draftLocation.lat];
    if (draftMarkerRef.current) {
      draftMarkerRef.current.setLngLat(lngLat);
    } else {
      draftMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' })
        .setLngLat(lngLat)
        .addTo(map);
    }

    // 投稿フォームに仮ピンが隠れる場合は地図をずらす
    //   スマホ: フォームは下からのシート → ピンを画面上部へ
    //   PC:     フォームは右側のパネル (幅 約400px) → ピンを左へ
    const { clientWidth: w, clientHeight: h } = map.getContainer();
    const pt = map.project(lngLat);
    if (w < 768) {
      if (pt.y > h * 0.25) map.easeTo({ center: lngLat, offset: [0, -h * 0.32], duration: 500 });
    } else if (pt.x > w - 420) {
      map.easeTo({ center: lngLat, offset: [-210, 0], duration: 500 });
    }
  }, [draftLocation]);

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
