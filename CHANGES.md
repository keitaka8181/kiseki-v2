# kiseki-v2 変更ファイル一式

リポジトリのルートに、このフォルダの構成のまま上書きしてください。

## 1. Supabase スキーマ
- `supabase_schema.sql`
  - 入力の検査を RLS のポリシーから CHECK 制約に移動（`validation.ts` の上限値と一致）
  - anon / authenticated 向けのポリシーを削除し、テーブルと連番の権限を revoke
  - DB へのアクセスはサーバー専用の鍵を使う /api/data からのみ

## 2. 右クリック／長押しでの投稿（kiseki-changed-files.zip の内容）
- `src/components/ui/AddMemoryForm.tsx`（新規）
- `src/lib/avatars.ts`（新規）
- `src/lib/validation.ts`（新規）
- `src/components/MapExplorer.tsx`
- `src/components/map/MapView.tsx`
- `src/hooks/useMemories.ts`
- `src/app/api/data/route.ts`
- `src/app/page.tsx`
- `src/app/submit/page.tsx`

※ `page.tsx` / `submit/page.tsx` / `validation.ts` は、下の 3 に合わせて
  import 先を `@/lib/data` → `@/lib/memory-utils` に変更済み。

## 3. DB へのアクセスをサーバー専用にする変更
- `src/lib/supabase.ts`：`server-only` を追加。鍵を `SUPABASE_URL` / `SUPABASE_SECRET_KEY` に変更
- `src/lib/data.ts`：`server-only` を追加。ブラウザでも使う型・関数を memory-utils.ts へ移動
- `src/lib/memory-utils.ts`（新規）：`NewMemoryInput` / `filterMemories` / `getUniqueYears` / `getUniqueHashtags`
- `package.json`：`server-only` を追加（上書き後に `npm install` を実行）

## 4. ウェルカム画面の「のこす」を削除
- `src/components/modal/WelcomeModal.tsx`：Google フォームへのリンクを削除し、「たどる」のみに
  ※ ヘッダー右上の「のこす」（`src/components/ui/Header.tsx`）は変更していない

## 必要な環境変数
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SECRET_KEY=（Supabase の Secret key / service_role）
MAPTILER_API_KEY=（変更なし）
