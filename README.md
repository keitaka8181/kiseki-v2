# キセキ (Kiseki) v2

思い出を地図上に投稿・閲覧できる Next.js アプリ。Supabase をバックエンドに、
MapLibre GL で地図を表示し、投稿された思い出（メッセージ・場所・年代・ジャンル・ハッシュタグなど）
をピンとして探索できる。

## 主な機能

- `/`（`src/app/page.tsx`）— 地図・サイドバー・検索・タイムラインを組み合わせたメイン画面（`MapExplorer` / `AppLayout`）
  - 検索語・ハッシュタグ・年・ジャンルでの絞り込み（`useMapFilter`）
  - 地図の背景レイヤー切り替え（`lib/basemaps.ts`）
- `/submit`（`src/app/submit/page.tsx`）— 新しい思い出の投稿フォーム（ニックネーム・場所・緯度経度・年代・アバター・ハッシュタグ・ジャンル）
- `/3d`（`src/app/3d/page.tsx`）— 試験中の 3D 表示。トップページと同じ画面に、Three.js の 3D マーカー（光の柱・回るキューブ・地面のリング）を重ねる
  - 描画は `src/components/map/three/ThreeMemoryLayer.ts`（MapLibre のカスタムレイヤー）。地球儀表示に対応するため、`map.transform.getMatrixForModel()` で思い出ごとの変換行列を使う
  - three.js はこの画面でだけ読み込むので、トップページの読み込みは重くならない
- `src/app/api/geocode` — MapTiler Geocoding API をサーバー側でプロキシするAPIルート（APIキーをクライアントに露出させないため）
- `src/app/api/data` — データ取得系のAPIルート

データモデルは `src/types/index.ts` の `Memory` 型、Supabaseとのやり取りは `src/lib/data.ts` / `src/lib/supabase.ts` を参照。
テーブル定義は `supabase_schema.sql` にある。

## セットアップ

```bash
cp .env.example .env.local
# Supabase URL/匿名キー、MapTiler APIキーを設定
npm install
npm run dev
```

## 環境変数（`.env.example` より）

- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — Supabase接続情報。サーバー側でのみ使用し、クライアントには公開しない（`NEXT_PUBLIC_` を付けない）
- `MAPTILER_API_KEY` — MapTiler Geocoding用。サーバー側プロキシ(`/api/geocode`)でのみ使用し、クライアントには公開しない

## 技術スタック

Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / MapLibre GL / Supabase
