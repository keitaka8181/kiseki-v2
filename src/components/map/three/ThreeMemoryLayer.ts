/**
 * ThreeMemoryLayer（試験中の機能。/3d でのみ読み込まれる）
 * ----------------------------------------------------------------------------
 * 思い出の場所に「光の柱・回るキューブ・地面のリング」を Three.js で描く
 * MapLibre のカスタムレイヤー。地図と同じ WebGL コンテキストに重ねて描画する。
 *
 * 地球儀表示（globe）への対応が要点:
 *   - 緯度経度を Mercator 座標 (0..1) に置く方式は平面表示でしか正しく描けない。
 *   - そこで思い出ごとに map.transform.getMatrixForModel() で変換行列をもらい、
 *     defaultProjectionData.mainMatrix と掛け合わせて投影する（MapLibre v5 の方式）。
 *   - getMatrixForModel() は「メートル単位・Y が上」のモデルを前提にしているので、
 *     部品はメートル単位で作り、グループの回転はしない。
 *
 * 同じ場所の思い出:
 *   - 同じ地点に複数の投稿があると、柱とキューブが（揺れのタイミング違いで）何重にも
 *     重なって見える。そこで緯度経度がほぼ同じ（約1m以内）思い出は 1 本にまとめ、
 *     件数が多い場所ほど柱を高くする。
 *
 * 描画の軽さ:
 *   - 柱・キューブ・リングをそれぞれ InstancedMesh にまとめ、全件を 3 回の描画で済ませる。
 *   - 毎フレーム「画面中央の地点」を原点にして各思い出の相対行列を計算する。
 *     GPU に渡る数値を小さく保ち、拡大時の揺れ（精度落ち）を防ぐため。
 * ----------------------------------------------------------------------------
 */

import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';
import * as THREE from 'three';

import type { Memory } from '@/types';
import { genreLabel } from '@/lib/avatars';
import { groupByLocation } from '@/lib/memory-utils';

interface Options {
  id: string;
  memories: Memory[];
  selectedId?: number | null;
}

/** 3D マーカー 1 本分。同じ場所の思い出はまとめて 1 本にする */
interface Item {
  /** この場所にある思い出の id（選択中かどうかの判定に使う） */
  ids: Set<number>;
  /** この場所にある思い出の件数（多いほど柱を高くする） */
  count: number;
  lng: number;
  lat: number;
  /** 緯度による地図の縮尺補正（cos(lat)） */
  cosLat: number;
  /** 揺れのタイミングを思い出ごとにずらすための位相 */
  phase: number;
  color: THREE.Color;
  /** 地球儀の裏側判定用の単位ベクトル */
  unit: THREE.Vector3;
}

// ジャンルごとの色（GENRES の先頭の英単語で引く）
const GENRE_COLORS: Record<string, number> = {
  ADVENTURE: 0xff944d,
  DISCOVERY: 0x4da8ff,
  FUN:       0xffd24d,
  NOSTALGIA: 0xb98cff,
  ROMANCE:   0xff5c8a,
};
const DEFAULT_COLOR = 0xdfe6ff;

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const TILE_SIZE = 512; // MapLibre のタイルサイズ（ズームと縮尺の換算に使う）

// 部品の形（高さ 1 に対する比率。実際の大きさは毎フレーム決める）
const CUBE_SIZE = 0.22;
const CUBE_HEIGHT = 1.18; // キューブの中心の高さ
const RING_LIFT = 0.012;  // 地表とちらつかないよう、リングを少し浮かせる

export class ThreeMemoryLayer implements CustomLayerInterface {
  public readonly id: string;
  public readonly type = 'custom' as const;
  public readonly renderingMode = '3d' as const;

  private map: MapLibreMap | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.Camera();
  private readonly clock = new THREE.Clock();
  private readonly reducedMotion: boolean;

  private items: Item[] = [];
  private selectedId: number | null;

  private pillars: THREE.InstancedMesh | null = null;
  private cubes: THREE.InstancedMesh | null = null;
  private rings: THREE.InstancedMesh | null = null;

  private readonly geometries = {
    pillar: new THREE.CylinderGeometry(0.035, 0.08, 1, 12).translate(0, 0.5, 0),
    cube: new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE),
    ring: new THREE.RingGeometry(0.16, 0.21, 40).rotateX(-Math.PI / 2), // Y が上なので XZ 平面＝地面
  };
  private readonly materials = {
    pillar: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }),
    cube: new THREE.MeshBasicMaterial(),
    ring: new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false,
    }),
  };

  // 毎フレーム使い回す作業用オブジェクト（GC を減らす）
  private readonly tmp = {
    main: new THREE.Matrix4(),
    origin: new THREE.Matrix4(),
    originInv: new THREE.Matrix4(),
    model: new THREE.Matrix4(),
    local: new THREE.Matrix4(),
    out: new THREE.Matrix4(),
    quat: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    pos: new THREE.Vector3(),
    scale: new THREE.Vector3(),
    center: new THREE.Vector3(),
    color: new THREE.Color(),
  };
  private static readonly HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);
  private static readonly WHITE = new THREE.Color(0xffffff);

  constructor(opts: Options) {
    this.id = opts.id;
    this.selectedId = opts.selectedId ?? null;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    this.setItems(opts.memories);
  }

  // ---- CustomLayerInterface ----

  public onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false; // MapLibre が描いた地図を消さない
    this.rebuildMeshes();
  }

  public render(_gl: WebGLRenderingContext | WebGL2RenderingContext, args: CustomRenderMethodInput): void {
    const map = this.map;
    const renderer = this.renderer;
    if (!map || !renderer || !this.pillars || !this.cubes || !this.rings) return;

    const { main, origin, originInv, model, local, out, quat, euler, pos, scale, center, color } = this.tmp;
    const t = this.reducedMotion ? 0 : this.clock.getElapsedTime();
    const zoom = map.getZoom();
    const isGlobe = map.getProjection()?.type === 'globe';

    // 原点＝画面中央。camera = mainMatrix × 原点の行列
    const c = map.getCenter();
    origin.fromArray(map.transform.getMatrixForModel([c.lng, c.lat], 0));
    originInv.copy(origin).invert();
    main.fromArray(args.defaultProjectionData.mainMatrix);
    this.camera.projectionMatrix.multiplyMatrices(main, origin);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
    lngLatToUnit(c.lng, c.lat, center);

    // 画面上でおよそ何 px の高さに見せるか（引いた状態では小さめにして重なりを減らす）
    const px = THREE.MathUtils.lerp(44, 80, THREE.MathUtils.clamp((zoom - 3) / 8, 0, 1));
    const metersPerPxAtEquator = EARTH_CIRCUMFERENCE_M / (TILE_SIZE * Math.pow(2, zoom));

    this.items.forEach((it, i) => {
      // 地球儀の裏側にある思い出は描かない（地表が奥行きを書かないため透けて見える）
      if (isGlobe && it.unit.dot(center) < 0.15) {
        this.pillars!.setMatrixAt(i, ThreeMemoryLayer.HIDDEN);
        this.cubes!.setMatrixAt(i, ThreeMemoryLayer.HIDDEN);
        this.rings!.setMatrixAt(i, ThreeMemoryLayer.HIDDEN);
        return;
      }

      const selected = this.selectedId !== null && it.ids.has(this.selectedId);
      const speed = selected ? 2 : 1;
      // 高さ（メートル）。思い出が多い場所ほど高く（2件で約1.25倍、16件で2倍が上限）
      const many = Math.min(1 + 0.25 * Math.log2(it.count), 2);
      const h = px * many * (selected ? 1.6 : 1) * metersPerPxAtEquator * it.cosLat;

      // 思い出の地点 → 原点からの相対行列。拡大縮小は h（メートル）
      model.fromArray(map.transform.getMatrixForModel([it.lng, it.lat], 0));
      model.premultiply(originInv);
      scale.setScalar(h);

      // 柱
      local.makeScale(h, h, h);
      this.pillars!.setMatrixAt(i, out.multiplyMatrices(model, local));

      // キューブ（ゆっくり回りながら上下に揺れる）
      const bob = Math.sin(t * 2 * speed + it.phase) * 0.06;
      euler.set(t * 0.8 * speed + it.phase, t * 1.2 * speed + it.phase, 0);
      quat.setFromEuler(euler);
      pos.set(0, (CUBE_HEIGHT + bob) * h, 0);
      local.compose(pos, quat, scale);
      this.cubes!.setMatrixAt(i, out.multiplyMatrices(model, local));

      // 地面のリング（ゆっくり回る）
      euler.set(0, t * 0.3 * speed + it.phase, 0);
      quat.setFromEuler(euler);
      pos.set(0, RING_LIFT * h, 0);
      local.compose(pos, quat, scale);
      this.rings!.setMatrixAt(i, out.multiplyMatrices(model, local));

      // 選択中は白っぽく明るくする
      color.copy(it.color);
      if (selected) color.lerp(ThreeMemoryLayer.WHITE, 0.45);
      this.pillars!.setColorAt(i, color);
      this.cubes!.setColorAt(i, color);
      this.rings!.setColorAt(i, color);
    });

    for (const mesh of [this.pillars, this.cubes, this.rings]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    renderer.resetState();
    renderer.render(this.scene, this.camera);

    // アニメーションのため次のフレームも描く（動きを減らす設定なら止める）
    if (!this.reducedMotion) map.triggerRepaint();
  }

  public onRemove(): void {
    this.disposeMeshes();
    Object.values(this.geometries).forEach((g) => g.dispose());
    Object.values(this.materials).forEach((m) => m.dispose());
    // renderer は地図と GL コンテキストを共有しているので dispose しない
    this.renderer = null;
    this.map = null;
  }

  // ---- 外部から状態を更新する ----

  public updateMemories(memories: Memory[]): void {
    this.setItems(memories);
    if (this.renderer) this.rebuildMeshes();
    this.map?.triggerRepaint();
  }

  public setSelected(id: number | null): void {
    this.selectedId = id;
    this.map?.triggerRepaint();
  }

  // ---- 内部処理 ----

  private setItems(memories: Memory[]): void {
    // 同じ場所（約1m以内）の思い出を 1 本にまとめる（2D マーカーと同じ判定）
    this.items = groupByLocation(memories)
      .filter((g) => g.lat >= -85 && g.lat <= 85) // 地図の端（極付近）は描けないので除く
      .map((g) => ({
        ids: new Set(g.memories.map((m) => m.id)),
        count: g.memories.length,
        lng: g.lng,
        lat: g.lat,
        cosLat: Math.cos((g.lat * Math.PI) / 180),
        phase: hashToPhase(g.memories[0].id),
        color: new THREE.Color(GENRE_COLORS[mostCommonGenre(g.memories)] ?? DEFAULT_COLOR),
        unit: lngLatToUnit(g.lng, g.lat, new THREE.Vector3()),
      }));
  }

  private rebuildMeshes(): void {
    this.disposeMeshes();
    const n = Math.max(this.items.length, 1); // 0 件でも作っておく（count で 0 にする）
    const make = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(g, m, n);
      mesh.count = this.items.length;
      mesh.frustumCulled = false; // 位置は毎フレーム行列で決まるため、three.js 側の判定は使わない
      mesh.setColorAt(0, new THREE.Color(DEFAULT_COLOR)); // instanceColor を確保
      this.scene.add(mesh);
      return mesh;
    };
    this.pillars = make(this.geometries.pillar, this.materials.pillar);
    this.rings = make(this.geometries.ring, this.materials.ring);
    this.cubes = make(this.geometries.cube, this.materials.cube);
  }

  private disposeMeshes(): void {
    for (const mesh of [this.pillars, this.cubes, this.rings]) {
      if (!mesh) continue;
      this.scene.remove(mesh);
      mesh.dispose(); // インスタンス用のバッファだけ解放（形と素材は使い回す）
    }
    this.pillars = this.cubes = this.rings = null;
  }
}

// ----------------------------------------------------------------------------

function lngLatToUnit(lng: number, lat: number, out: THREE.Vector3): THREE.Vector3 {
  const lo = (lng * Math.PI) / 180;
  const la = (lat * Math.PI) / 180;
  return out.set(Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la));
}

/** その場所でいちばん多いジャンル（同数なら先に出てきたもの）。色を決めるのに使う */
function mostCommonGenre(group: Memory[]): string {
  const counts = new Map<string, number>();
  let best = '';
  let bestCount = 0;
  for (const m of group) {
    const g = genreLabel(m.genre || '');
    if (!g) continue;
    const c = (counts.get(g) ?? 0) + 1;
    counts.set(g, c);
    if (c > bestCount) { best = g; bestCount = c; }
  }
  return best;
}

/** id から 0..2π の固定の位相を作る（思い出ごとに揺れをずらす） */
function hashToPhase(id: number): number {
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * Math.PI * 2;
}
