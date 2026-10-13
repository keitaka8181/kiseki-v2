# キセキ (Kiseki) v2

思い出の場所を地図に残して、たどれる Next.js アプリ。地球儀表示の地図（MapLibre GL）に、
投稿された思い出（場所・メッセージ・年・ジャンル・ハッシュタグ・アバター）がマーカーとして並ぶ。
データは Supabase に保存し、読み書きはすべてサーバー側の API ルートを通す。

## 画面

- `/` — メイン画面。最初にウェルカム画面（「たどる」）を出し、進むと地図になる
- `/3d` — 試験中の 3D 表示。`/` と同じ画面に Three.js の 3D マーカーを重ねる（検索結果には出さない設定）
- `/submit` — 緯度経度を手入力する単独の投稿フォーム。画面内からのリンクは無く、URL を直接開いて使う

`/` と `/3d` は同じ `HomeScreen`（`src/components/HomeScreen.tsx`）を使い、`enable3D` の有無だけが違う。

## 主な機能

### たどる

- 検索バーで、場所の名前・思い出・あだ名・ハッシュタグを対象に絞り込む
- 年のボタン（`TimelineControls`）で、その年の思い出だけに絞り込む
- 思い出パネルのハッシュタグを押すと、そのタグで絞り込む
- 絞り込みの状態は URL のクエリ（`search` / `hashtag` / `year` / `genre`）に書き出す。
  今のところ書き出すだけで、読み込み時に URL から復元はしない。ジャンルで絞り込む UI もまだ無い
- 同じ場所（緯度経度が約 1m 以内）の思い出は 1 つのマーカーにまとめて件数を出し、思い出パネルの ‹ › で切り替える
  （`groupByLocation` / `locationKey`、`src/lib/memory-utils.ts`）
- サイドバー（左上のメニュー）と画面下の横スクロールに、絞り込み後の思い出が一覧で出る
- 画面下の年代のつまみ（`BasemapTimeline`）で背景の航空写真を切り替える。
  国土地理院の 1961 / 1974 / 1979 / 1984 / 1987 年と、Esri の現在の写真（`src/lib/basemaps.ts`）

### のこす

- 地図を右クリック（タッチ端末は長押し）すると、その地点の投稿フォーム（`AddMemoryForm`）が開く
- 入力はブラウザとサーバーで同じ関数（`validateNewMemory`、`src/lib/validation.ts`）で検査する
- 投稿した思い出は、絞り込みを解除したうえですぐ地図に出る
- あだ名とアバターは端末（localStorage）に覚えておき、次の投稿で入力を省く
- ジャンルは v1 と同じ 5 種類、アバターは 31 種類（`src/lib/avatars.ts`）

### 3D 表示（試験中）

- 思い出の場所に、光の柱・回るキューブ・地面のリングを描く。色はジャンルごと、同じ場所の件数が多いほど柱が高い
- 描画は `src/components/map/three/ThreeMemoryLayer.ts`（MapLibre のカスタムレイヤー）。
  地球儀表示に対応するため、`map.transform.getMatrixForModel()` で場所ごとの変換行列を使う
- three.js は `/3d` でだけ読み込むので、トップページの読み込みは重くならない

## API ルート

- `GET /api/data` — 思い出の一覧を新しい順で返す。5 分間キャッシュする
  （投稿直後の分は、ブラウザ側で一覧に足して補う）
- `POST /api/data` — 思い出を 1 件追加する。検査に通らなければ 400、保存に失敗すれば 500
- `GET /api/geocode?q=...&lang=...` — MapTiler Geocoding API のサーバー側プロキシ。
  API キーをブラウザに出さないためのもの。ルートはあるが、画面からはまだ呼んでいない。
  キャッシュやレート制限も未実装

## データとアクセス制御

- テーブル定義は `supabase_schema.sql`（`public.memories`）。アプリ側の型は `src/types/index.ts` の `Memory`
- データベースに触れるのは `/api/data` だけ。`src/lib/supabase.ts` と `src/lib/data.ts` は `server-only` で、
  ブラウザ側から import するとビルドエラーになる
- サーバーは Supabase のサーバー専用の鍵を使う。RLS は有効でポリシーは作らず、
  公開用の `anon` / `authenticated` ロールからは読み取りも書き込みもできない
- サーバー専用の鍵は RLS の対象外なので、文字数や緯度経度の範囲はテーブルの CHECK 制約でも検査する。
  制約の値は `src/lib/validation.ts` の `LIMITS` と揃えること
- 更新・削除の機能はアプリには無い。Supabase の管理画面から行う

## セットアップ

```bash
cp .env.example .env.local
# SUPABASE_URL / SUPABASE_SECRET_KEY / MAPTILER_API_KEY を設定
pnpm install
pnpm dev
```

Supabase 側は、`supabase_schema.sql` を SQL エディタで実行してテーブルを作る。

パッケージマネージャは pnpm（ロックファイルは `pnpm-lock.yaml`）。

## 環境変数（`.env.example` より）

どれもサーバー側でだけ使う。ブラウザに公開しないため、`NEXT_PUBLIC_` を付けない。

- `SUPABASE_URL` / `SUPABASE_SECRET_KEY` — Supabase の接続先と、サーバー専用の鍵。未設定だと `/api/data` がエラーになる
- `MAPTILER_API_KEY` — `/api/geocode` 用。未設定だとこのルートが 500 を返す

## 技術スタック

Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS v4 / MapLibre GL v5 / Three.js / Supabase
