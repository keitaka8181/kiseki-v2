'use client';

import { useEffect, useRef } from 'react';
import { Memory } from '@/types';
import { groupByLocation, type LocationGroup } from '@/lib/memory-utils';
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
  /** Three.js の 3D マーカーを重ねる（試験中。/3d でのみ true） */
  enable3D?: boolean;
  /** 3D マーカーで強調する思い出の id */
  selectedMemoryId?: number | null;
}

type ThreeLayer = import('./three/ThreeMemoryLayer').ThreeMemoryLayer;
const THREE_LAYER_ID = 'kiseki-three-memories';

const AVATAR_SIZE = 40;
const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE = 10; // px

export default function MapView({
  memories, onMarkerClick, flyToMemory, activeBasemap, onMapContextMenu, draftLocation,
  enable3D = false, selectedMemoryId = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markersRef = useRef<import('maplibre-gl').Marker[]>([]);
  // まとめたマーカーごとの「どの思い出の顔を出しているか」を後から差し替えるための参照
  const markerViewsRef = useRef<{ group: LocationGroup; img: HTMLImageElement }[]>([]);
  const mapLoadedRef = useRef(false);
  const memoriesRef = useRef(memories);
  const onMarkerClickRef = useRef(onMarkerClick);
  const pendingBasemapRef = useRef<BasemapLayer | null>(null);
  const onMapContextMenuRef = useRef(onMapContextMenu);
  const draftMarkerRef = useRef<import('maplibre-gl').Marker | null>(null);
  const threeLayerRef = useRef<ThreeLayer | null>(null);
  const threeAttachingRef = useRef(false);
  const threeRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedIdRef = useRef(selectedMemoryId);
  memoriesRef.current = memories;
  onMarkerClickRef.current = onMarkerClick;
  onMapContextMenuRef.current = onMapContextMenu;
  selectedIdRef.current = selectedMemoryId;

  // 3D レイヤーがなければ追加する。ベースマップ切替でレイヤーが消えたときにも呼ばれる。
  // three.js は大きいので、3D を使う画面でだけ読み込む（トップページの読み込みは重くならない）
  async function ensureThreeLayer(map: import('maplibre-gl').Map) {
    if (!enable3D || threeAttachingRef.current) return;
    if (!map.isStyleLoaded()) {
      // 切替直後はスタイルの読み込み中。少し待ってから確かめ直す（多重に予約しない）
      if (!threeRetryRef.current) {
        threeRetryRef.current = setTimeout(() => {
          threeRetryRef.current = null;
          if (mapRef.current === map) ensureThreeLayer(map);
        }, 150);
      }
      return;
    }
    if (map.getLayer(THREE_LAYER_ID)) {
      // ベースマップ切替では 3D レイヤーが残ったまま新しい航空写真が上に足され、隠れてしまう。
      // 一番上でなければ一番上へ戻す
      const order = map.getLayersOrder();
      if (order[order.length - 1] !== THREE_LAYER_ID) map.moveLayer(THREE_LAYER_ID);
      return;
    }
    threeAttachingRef.current = true;
    try {
      const { ThreeMemoryLayer } = await import('./three/ThreeMemoryLayer');
      if (mapRef.current !== map || map.getLayer(THREE_LAYER_ID)) return;
      const layer = new ThreeMemoryLayer({
        id: THREE_LAYER_ID,
        memories: memoriesRef.current,
        selectedId: selectedIdRef.current,
      });
      map.addLayer(layer);
      threeLayerRef.current = layer;
    } catch (e) {
      console.error('[3D] レイヤーを追加できませんでした:', e);
    } finally {
      threeAttachingRef.current = false;
    }
  }

  /** その場所で表示する思い出（選択中の思い出があればそれ、なければ最新の 1 件） */
  function representative(group: LocationGroup): Memory {
    const sel = selectedIdRef.current;
    return group.memories.find((m) => m.id === sel) ?? group.memories[0];
  }

  function setAvatar(img: HTMLImageElement, memory: Memory) {
    const src = `/images/avatars/${memory.avatar || 'boy'}.png`;
    if (img.getAttribute('src') !== src) img.src = src;
    img.alt = memory.nickname;
  }

  function refreshMarkers(
    map: import('maplibre-gl').Map,
    gl: typeof import('maplibre-gl'),
    data: Memory[]
  ) {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerViewsRef.current = [];

    // 同じ場所の思い出は 1 つのマーカーにまとめ、件数を右上に出す
    // （まとめないと、座標が完全に一致する投稿は一番上の 1 人しか見えない）
    groupByLocation(data).forEach((group) => {
      const count = group.memories.length;

      const el = document.createElement('div');
      // position は指定しない（MapLibre が maplibregl-marker で absolute にして位置を決めるため）
      el.style.cssText = `width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;cursor:pointer;`;
      el.title = count > 1 ? `この場所の思い出 ${count}件` : '';

      const face = document.createElement('div');
      face.style.cssText = `
        width:100%;height:100%;
        border-radius:50%;overflow:hidden;
        border:2px solid white;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        background:#eee;
      `;
      const img = document.createElement('img');
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = () => { img.src = '/images/avatars/boy.png'; };
      setAvatar(img, representative(group));
      face.appendChild(img);
      el.appendChild(face);

      if (count > 1) {
        const badge = document.createElement('div');
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.cssText = `
          position:absolute;top:-6px;right:-8px;
          min-width:20px;height:20px;padding:0 5px;box-sizing:border-box;
          border-radius:10px;border:2px solid white;
          background:#1f2937;color:white;
          font-size:11px;font-weight:700;line-height:16px;text-align:center;
          box-shadow:0 1px 3px rgba(0,0,0,0.4);pointer-events:none;
        `;
        el.appendChild(badge);
      }

      el.addEventListener('click', () => onMarkerClickRef.current(representative(group)));

      const marker = new gl.Marker({ element: el })
        .setLngLat([group.lng, group.lat])
        .addTo(map);
      markersRef.current.push(marker);
      markerViewsRef.current.push({ group, img });
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
        ensureThreeLayer(map);
      });

      // ベースマップ切替（setStyle）のあと、3D レイヤーが消えていれば付け直し、
      // 新しい航空写真の下に隠れていれば一番上へ戻す
      if (enable3D) {
        map.on('styledata', () => {
          if (!mapLoadedRef.current) return;
          ensureThreeLayer(map);
        });
      }

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
      threeLayerRef.current = null;
      if (threeRetryRef.current) clearTimeout(threeRetryRef.current);
      threeRetryRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      markerViewsRef.current = [];
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
    if (mapRef.current.getLayer(THREE_LAYER_ID)) threeLayerRef.current?.updateMemories(memories);
  }, [memories]);

  // 選択が変わったら、まとめたマーカーの顔を選択中の人に差し替え、3D マーカーも強調する
  useEffect(() => {
    markerViewsRef.current.forEach(({ group, img }) => setAvatar(img, representative(group)));
    if (mapRef.current?.getLayer(THREE_LAYER_ID)) threeLayerRef.current?.setSelected(selectedMemoryId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMemoryId]);

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
