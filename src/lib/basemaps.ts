// ============================================================
// Basemap layer definitions
// ============================================================

export interface BasemapLayer {
  id: string;
  name: string;
  group: string;
  note?: string;
  style: object;
}

function rasterStyle(id: string, tiles: string[], attribution: string): object {
  return {
    version: 8,
    projection: { type: 'globe' }, // globe をスタイルに埋め込む (MapLibre v5)
    sources: {
      [id]: {
        type: 'raster',
        tiles,
        tileSize: 256,
        attribution,
        maxzoom: 19,
      },
    },
    layers: [{ id: `${id}-layer`, type: 'raster', source: id }],
  };
}

const GSI_ATTR = '地理院タイル &copy; <a href="https://www.gsi.go.jp/" target="_blank">国土地理院</a>';

export const BASEMAP_LAYERS: BasemapLayer[] = [
  {
    id: 'gsi-ort-old10',
    name: '1961',
    group: 'GSI',
    note: 'Coverage may be limited.',
    style: rasterStyle(
      'gsi-ort-old10',
      ['https://cyberjapandata.gsi.go.jp/xyz/ort_old10/{z}/{x}/{y}.png'],
      GSI_ATTR
    ),
  },
  {
    id: 'gsi-gazo1',
    name: '1974',
    group: 'GSI',
    note: 'Coverage may be limited.',
    style: rasterStyle(
      'gsi-gazo1',
      ['https://cyberjapandata.gsi.go.jp/xyz/gazo1/{z}/{x}/{y}.jpg'],
      GSI_ATTR
    ),
  },
  {
    id: 'gsi-gazo2',
    name: '1979',
    group: 'GSI',
    note: 'Coverage may be limited.',
    style: rasterStyle(
      'gsi-gazo2',
      ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
      GSI_ATTR
    ),
  },
  {
    id: 'gsi-gazo3',
    name: '1984',
    group: 'GSI',
    note: 'Coverage may be limited.',
    style: rasterStyle(
      'gsi-gazo3',
      ['https://cyberjapandata.gsi.go.jp/xyz/gazo3/{z}/{x}/{y}.jpg'],
      GSI_ATTR
    ),
  },
  {
    id: 'gsi-gazo4',
    name: '1987',
    group: 'GSI',
    note: 'Coverage may be limited.',
    style: rasterStyle(
      'gsi-gazo4',
      ['https://cyberjapandata.gsi.go.jp/xyz/gazo4/{z}/{x}/{y}.jpg'],
      GSI_ATTR
    ),
  },
  {
    id: 'esri-world-imagery',
    name: 'Today',
    group: 'Esri',
    note: 'Tiles © Esri — Source: Esri, Earthstar Geographics.',
    style: rasterStyle(
      'esri-world-imagery',
      ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
    ),
  },
];

export const DEFAULT_BASEMAP_ID = 'esri-world-imagery';

export const DEFAULT_MAP_CENTER: [number, number] = [139.9, 35.72];
export const DEFAULT_MAP_ZOOM = 2;
export const DEFAULT_MAP_PITCH = 0;
export const DEFAULT_MAP_BEARING = 0;

export const JAPAN_FLY_IN = {
  center: [139.9, 35.72] as [number, number],
  zoom: 10,
  pitch: 50,
  bearing: -10,
  duration: 3000,
};
