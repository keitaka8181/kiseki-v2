// ============================================================
// Core data types for キセキ (Kiseki) map application
// ============================================================

export interface Memory {
  id: number;
  timestamp: string;          // タイムスタンプ
  nickname: string;            // あなたのあだ名
  placeName: string;           // 思い出の場所の名前
  memory: string;               // どういう思い出？
  latLng: string;              // 緯度経度をゲット！ (raw "lat, lng" string)
  lat: number;
  lng: number;
  age: string;                 // あなたはおいくつ？
  avatar: string;              // アバターを選ぶ
  hashtags: string;            // #ハッシュタグ（複数OK）
  genre: string;               // ジャンル
  year: string;                // 西暦で何年の思い出？
}

// Basemap configuration
export interface BasemapOption {
  id: string;
  label: string;
  labelJa: string;
  style: string;
}

// Filter/search state
export interface FilterState {
  searchTerm: string;
  hashtag: string | null;
  year: string | null;
  genre: string | null;
}

// URL params supported by the app
export interface UrlParams {
  search?: string;
  hashtag?: string;
  year?: string;
  id?: string;
}
