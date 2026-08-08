-- ============================================================
-- キセキ Supabase スキーマ
-- ============================================================

create table public.memories (
  id          bigserial primary key,
  timestamp   timestamptz not null default now(),  -- 投稿日時
  nickname    text not null,                        -- あなたのあだ名
  place_name  text not null,                        -- 思い出の場所の名前
  story       text not null,                        -- どういう思い出？
  lat         double precision not null,            -- 緯度
  lng         double precision not null,            -- 経度
  age         text,                                 -- あなたはおいくつ？(文字列のまま)
  avatar      text default 'boy',                   -- アバターを選ぶ
  hashtags    text default '',                      -- #ハッシュタグ（複数OK）
  genre       text,                                 -- ジャンル
  year        text                                  -- 西暦で何年の思い出？
);

-- 表示時の並び替え・年フィルタが頻繁なのでインデックスを張る
create index memories_timestamp_idx on public.memories (timestamp desc);
create index memories_year_idx      on public.memories (year);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.memories enable row level security;

-- 誰でも投稿可能（匿名フォーム想定、スパム対策はアプリ側 or Edge Functionで）
create policy "anyone can insert memories"
  on public.memories for insert
  to anon, authenticated
  with check (
    -- 最低限のバリデーション: 必須フィールドと緯度経度の範囲
    char_length(nickname)   between 1 and 100 and
    char_length(place_name) between 1 and 200 and
    char_length(story)      between 1 and 2000 and
    lat between -90  and 90 and
    lng between -180 and 180
  );

-- サイト表示のため全件読み取り可能
create policy "anyone can read memories"
  on public.memories for select
  to anon, authenticated
  using (true);

-- 更新・削除はクライアント不可（管理はダッシュボードorサービスロールで）
-- ポリシーを作らない＝拒否、が RLS のデフォルト。
