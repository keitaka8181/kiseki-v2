/**
 * Geocoding 関連の共通型定義
 * サーバー側 API ルートとクライアント側ライブラリの両方から import される
 */

/**
 * 整形済み検索結果。フロントエンドが直接使う形。
 */
export interface GeocodeResult {
  /** MapTiler が返す一意な ID */
  id: string;
  /** 表示名 (例: "東京駅") */
  name: string;
  /** フル住所 (例: "東京駅, 千代田区, 東京都, 日本") */
  fullName: string;
  /**
   * MapTiler が「クエリにマッチした文字列」として返してくる値 (任意)。
   * 例: クエリ "Karuizawa" → name "軽井沢町" + matchedText "Karuizawa"
   * 例: クエリ "Fujisan" → name "富士山静岡空港" + matchedText "Fujisan Shizuoka Airport"
   * UI で「なぜこの結果が出たか」を補足表示するのに使う。
   * クエリと name が完全一致する場合は MapTiler 側で省略されることがある。
   */
  matchedText?: string;
  /** 緯度 */
  lat: number;
  /** 経度 */
  lng: number;
  /**
   * フィーチャータイプ
   * MapTiler の place_type[0] をそのまま入れる
   * 例: "country" | "region" | "city" | "town" | "village" | "poi" | "address" | "neighbourhood" など
   */
  type: string;
  /** 国名 (取得できれば) */
  country?: string;
  /** ISO 3166-1 alpha-2 国コード (取得できれば) */
  countryCode?: string;
  /** バウンディングボックス [west, south, east, north] (取得できれば) */
  bbox?: [number, number, number, number];
}

/**
 * /api/geocode のレスポンス形
 */
export interface GeocodeResponse {
  /** 整形済みの結果配列 */
  results: GeocodeResult[];
  /** MapTiler の生レスポンス (デバッグ用、Phase 1 では含める) */
  raw?: unknown;
}

/**
 * /api/geocode のエラーレスポンス形
 */
export interface GeocodeErrorResponse {
  error:
    | 'missing_query'
    | 'query_too_short'
    | 'query_too_long'
    | 'upstream_error'
    | 'server_misconfigured'
    | 'internal_error';
  message?: string;
}
