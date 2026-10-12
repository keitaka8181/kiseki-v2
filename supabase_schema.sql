-- ============================================================
-- キセキ Supabase スキーマ
--
-- データベースへのアクセスは kiseki-v2 のサーバー（/api/data）からのみ。
-- サーバーはサーバー専用の鍵（secret / service_role）を使い、
-- 公開用の anon キーでは読み取りも書き込みもできない。
-- ============================================================

create table public.memories (
  id          bigserial primary key,
  timestamp   timestamptz not null default now(),  -- 投稿日時
  nickname    text not null,                        -- あなたのあだ名
  place_name  text not null,                        -- 思い出の場所の名前
  memory      text not null,                        -- どういう思い出？
  lat         double precision not null,            -- 緯度
  lng         double precision not null,            -- 経度
  age         text,                                 -- あなたはおいくつ？(文字列のまま)
  avatar      text default 'boy',                   -- アバターを選ぶ
  hashtags    text default '',                      -- #ハッシュタグ（複数OK）
  genre       text,                                 -- ジャンル
  year        text,                                 -- 西暦で何年の思い出？

  -- ----------------------------------------------------------
  -- 入力の検査（CHECK 制約）
  -- サーバー専用の鍵は RLS を無視するため、検査は RLS ではなく
  -- テーブル自体の制約に置く。どの鍵で書き込んでも必ず効く。
  -- 値は src/lib/validation.ts の LIMITS と揃えること。
  -- ----------------------------------------------------------
  constraint memories_nickname_len   check (char_length(nickname)   between 1 and 100),
  constraint memories_place_name_len check (char_length(place_name) between 1 and 200),
  constraint memories_memory_len     check (char_length(memory)     between 1 and 2000),
  constraint memories_lat_range      check (lat between -90  and 90),
  constraint memories_lng_range      check (lng between -180 and 180),
  constraint memories_age_len        check (age is null or char_length(age) <= 20),
  constraint memories_hashtags_len   check (hashtags is null or char_length(hashtags) <= 300),
  constraint memories_year_format    check (year is null or year = '' or year ~ '^\d{4}$')
);

-- 表示時の並び替え・年フィルタが頻繁なのでインデックスを張る
create index memories_timestamp_idx on public.memories (timestamp desc);
create index memories_year_idx      on public.memories (year);

-- ============================================================
-- アクセス制御
-- ============================================================
-- RLS は有効のまま、ポリシーは作らない（＝ anon / authenticated は全拒否）。
-- サーバー専用の鍵は RLS の対象外なので、/api/data からは読み書きできる。
alter table public.memories enable row level security;

-- 念のため、公開用ロールからテーブルと連番の権限そのものを外す
revoke all on table    public.memories        from anon, authenticated;
revoke all on sequence public.memories_id_seq from anon, authenticated;

-- 更新・削除は Supabase の管理画面から行う。
