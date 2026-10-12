// ============================================================
// 投稿フォームで選べるアバター / ジャンル
// public/images/avatars/ に実在するファイル名と一致させること
// ============================================================

export const AVATARS = [
  'boy', 'girl',
  'young-man', 'young-woman',
  'man', 'woman',
  'senior-man', 'senior-woman',
  'old-man', 'old-woman',
  'sport-boy', 'sporty-boy', 'sporty-girl',
  'soccer-boy', 'soccer-girl',
  'basketball-boy', 'basketball-girl',
  'guitar-boy', 'guitar-girl',
  'rock-boy', 'rock-girl',
  'artist-boy', 'artist-girl',
  'computer-boy', 'computer-girl',
  'nerdy-boy', 'nerdy-girl',
  'otaku-boy', 'otaku-girl',
  'anime-boy', 'anime-girl',
] as const;

export type AvatarId = (typeof AVATARS)[number];

export const DEFAULT_AVATAR: AvatarId = 'boy';

export function isAvatarId(v: unknown): v is AvatarId {
  return typeof v === 'string' && (AVATARS as readonly string[]).includes(v);
}

// Google フォーム時代のデータと値を揃えるため、保存値は全文のまま
export const GENRES = [
  'ADVENTURE 迷子になった道、チャレンジした体験、道なき道を行く記録。',
  'DISCOVERY 初めて行った場所、自分を変えた旅、感動した景色。',
  'FUN 笑った瞬間、仲間との冒険、夏祭りやイベントの記憶。',
  'NOSTALGIA 子供の頃の遊び場、旧校舎、忘れられない家族旅行など。',
  'ROMANCE 恋人との想い出、公園でのキス、初めて手をつないだ場所など。',
] as const;

/** "ADVENTURE 迷子に…" → "ADVENTURE" */
export function genreLabel(genre: string): string {
  return genre.split(/\s+/)[0] ?? genre;
}
