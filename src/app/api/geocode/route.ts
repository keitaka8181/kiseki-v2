/**
 * /api/geocode
 *
 * MapTiler Geocoding API のサーバー側プロキシ。
 * クライアントからの検索リクエストを受けて、サーバー側に保持した API キーで
 * MapTiler に問い合わせ、整形して返す。
 *
 * Phase 1 (仕上げ): types を絞り、countryCode 抽出を正しくした。
 *   - types = poi, municipality, subregion, region, country
 *   - address は除外 (検索結果のノイズ削減)
 *
 * 保護機能 (キャッシュ、レート制限、Origin チェック、予算ガード) は Phase 2 で追加。
 *
 * 仕様:
 *   GET /api/geocode?q=<検索クエリ>&lang=<言語コード>
 *   - q (必須): 検索文字列。1〜200文字
 *   - lang (任意): 言語コード。デフォルト "ja,en"
 *
 * 成功時: 200 GeocodeResponse
 * 失敗時: 400 / 502 / 500 GeocodeErrorResponse
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GeocodeResponse, GeocodeErrorResponse, GeocodeResult } from '@/types/geocode';

const MAPTILER_BASE = 'https://api.maptiler.com/geocoding';
const DEFAULT_LANG = 'ja,en';
const RESULT_LIMIT = 8;
const QUERY_MIN_LEN = 1;
const QUERY_MAX_LEN = 200;

/**
 * MapTiler に問い合わせる feature type の一覧。
 * B案 (POI含む) の構成:
 *   - poi:         東京駅、富士山、東京タワー等のランドマーク
 *   - municipality: 市区町村 (柏市、千代田区)
 *   - subregion:   行政区分 (関東地方など、海外の州にも対応)
 *   - region:      都道府県・州 (東京都、カリフォルニア州)
 *   - country:     国 (日本、フランス)
 *
 * 意図的に除外:
 *   - address:    番地レベル住所 (検索結果がノイズだらけになる)
 *   - street:     通り (同上)
 *   - neighbourhood, locality: 丁目・地区 (細かすぎる)
 *
 * 設計メモ: ここを変更するとキャッシュキー (Phase 2) のヒット率に直結する。
 * 変更時は MAPTILER_TYPES_VERSION を上げてキャッシュを強制無効化すること。
 */
const MAPTILER_TYPES = 'poi,municipality,subregion,region,country';
const MAPTILER_TYPES_VERSION = 'v1';

export async function GET(req: NextRequest): Promise<NextResponse<GeocodeResponse | GeocodeErrorResponse>> {
  // --- 1. API キーの存在チェック (起動時設定ミスの早期発見) ---
  const apiKey = process.env.MAPTILER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'server_misconfigured', message: 'MAPTILER_API_KEY is not set' },
      { status: 500 }
    );
  }

  // --- 2. クエリパラメータの読み取りとバリデーション ---
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const lang = url.searchParams.get('lang')?.trim() || DEFAULT_LANG;

  if (q.length === 0) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }
  if (q.length < QUERY_MIN_LEN) {
    return NextResponse.json({ error: 'query_too_short' }, { status: 400 });
  }
  if (q.length > QUERY_MAX_LEN) {
    return NextResponse.json({ error: 'query_too_long' }, { status: 400 });
  }

  // --- 3. MapTiler にリクエスト ---
  const endpoint = `${MAPTILER_BASE}/${encodeURIComponent(q)}.json`;
  const params = new URLSearchParams({
    key: apiKey,
    language: lang,
    limit: String(RESULT_LIMIT),
    types: MAPTILER_TYPES,
  });

  let upstream: Response;
  try {
    upstream = await fetch(`${endpoint}?${params.toString()}`, {
      cache: 'no-store', // Phase 2 で Redis 側で制御
    });
  } catch (err) {
    console.error('[geocode] fetch failed:', err);
    return NextResponse.json(
      { error: 'upstream_error', message: 'Failed to reach MapTiler' },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    console.error('[geocode] upstream status:', upstream.status);
    return NextResponse.json(
      { error: 'upstream_error', message: `MapTiler returned ${upstream.status}` },
      { status: 502 }
    );
  }

  // --- 4. レスポンスを整形 ---
  let raw: unknown;
  try {
    raw = await upstream.json();
  } catch (err) {
    console.error('[geocode] failed to parse upstream json:', err);
    return NextResponse.json(
      { error: 'upstream_error', message: 'Invalid JSON from MapTiler' },
      { status: 502 }
    );
  }

  const results = normalizeMapTilerResponse(raw);

  return NextResponse.json({
    results,
    raw, // Phase 1 ではデバッグ用に生データも返す
  });
}

/**
 * MapTiler の GeoJSON FeatureCollection を、アプリで使いやすい形に整形する。
 *
 * MapTiler のレスポンス例 (関係する部分のみ):
 * {
 *   "features": [
 *     {
 *       "id": "municipality.79226",
 *       "text": "千代田区",
 *       "place_name": "千代田区, 東京都, 日本",
 *       "place_type": ["municipality"],
 *       "geometry": { "type": "Point", "coordinates": [139.75, 35.68] },
 *       "bbox": [...],
 *       "properties": { "country_code": "jp" },     // フィーチャー自体の国コード
 *       "context": [
 *         { "id": "subregion.535", "text": "東京都", "country_code": "jp" },
 *         { "id": "country.157", "text": "日本", "country_code": "jp" }
 *       ]
 *     }
 *   ]
 * }
 */
function normalizeMapTilerResponse(raw: unknown): GeocodeResult[] {
  if (!isObject(raw)) return [];
  const features = raw.features;
  if (!Array.isArray(features)) return [];

  const out: GeocodeResult[] = [];
  for (const f of features) {
    const r = featureToResult(f);
    if (r) out.push(r);
  }
  return out;
}

function featureToResult(f: unknown): GeocodeResult | null {
  if (!isObject(f)) return null;

  // geometry.coordinates から [lng, lat] を取り出す
  const geometry = f.geometry;
  if (!isObject(geometry)) return null;
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  // 必須の id, text, place_name
  const id = typeof f.id === 'string' ? f.id : String(f.id ?? '');
  const name = typeof f.text === 'string' ? f.text : '';
  const fullName = typeof f.place_name === 'string' ? f.place_name : name;
  if (!id || !name) return null;

  // place_type[0]
  const placeType =
    Array.isArray(f.place_type) && typeof f.place_type[0] === 'string' ? f.place_type[0] : 'unknown';

  // --- 国名と国コードを抽出 ---
  // 優先順位:
  //   1. フィーチャー自体が country の場合は自分の情報を使う
  //   2. context に country.* があればそれを使う (国名+国コード)
  //   3. context の他の要素や properties.country_code から国コードを補完
  let country: string | undefined;
  let countryCode: string | undefined;

  // 1. フィーチャー自体が country
  if (placeType === 'country') {
    country = name;
    const props = f.properties;
    if (isObject(props) && typeof props.country_code === 'string') {
      countryCode = props.country_code.toUpperCase();
    }
  }

  // 2. context から country を探す
  if (Array.isArray(f.context)) {
    for (const c of f.context) {
      if (!isObject(c)) continue;
      const cid = typeof c.id === 'string' ? c.id : '';
      // context の各要素にも country_code が入っているので拾える (フォールバック用)
      if (!countryCode && typeof c.country_code === 'string') {
        countryCode = c.country_code.toUpperCase();
      }
      // country.* タイプの context は国名+国コードのソース
      if (cid.startsWith('country') && typeof c.text === 'string') {
        if (!country) country = c.text;
        if (typeof c.country_code === 'string') {
          countryCode = c.country_code.toUpperCase();
        }
        break;
      }
    }
  }

  // 3. 最終フォールバック: フィーチャー自身の properties.country_code
  if (!countryCode) {
    const props = f.properties;
    if (isObject(props) && typeof props.country_code === 'string') {
      countryCode = props.country_code.toUpperCase();
    }
  }

  // bbox は任意
  let bbox: [number, number, number, number] | undefined;
  if (Array.isArray(f.bbox) && f.bbox.length === 4 && f.bbox.every((v) => typeof v === 'number')) {
    bbox = f.bbox as [number, number, number, number];
  }

  // matching_text は MapTiler が「クエリと一致した別表記」を返してくれるフィールド。
  // クエリと name が同じ場合は省略されることがあるので、任意扱い。
  const matchedText = typeof f.matching_text === 'string' ? f.matching_text : undefined;

  return {
    id,
    name,
    fullName,
    matchedText,
    lat,
    lng,
    type: placeType,
    country,
    countryCode,
    bbox,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * (内部用) このバージョンの types 設定の識別子。
 * Phase 2 でキャッシュキーに含める想定。
 * 例: cache key = `geocode:${MAPTILER_TYPES_VERSION}:${lang}:${q}`
 */
export { MAPTILER_TYPES_VERSION };
