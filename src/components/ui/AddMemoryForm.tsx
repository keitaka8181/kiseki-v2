'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Memory } from '@/types';
import { AVATARS, DEFAULT_AVATAR, GENRES, genreLabel, isAvatarId } from '@/lib/avatars';
import { LIMITS, MIN_YEAR, validateNewMemory } from '@/lib/validation';

interface Props {
  location: { lat: number; lng: number };
  onClose: () => void;
  onCreated: (memory: Memory) => void;
}

// 2回目以降の投稿で入力を省けるよう、あだ名とアバターだけ端末に覚えておく
const PROFILE_KEY = 'kiseki:profile';

function loadProfile(): { nickname: string; avatar: string } {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        nickname: typeof p.nickname === 'string' ? p.nickname : '',
        avatar: isAvatarId(p.avatar) ? p.avatar : DEFAULT_AVATAR,
      };
    }
  } catch { /* プライベートモード等では無視 */ }
  return { nickname: '', avatar: DEFAULT_AVATAR };
}

function saveProfile(nickname: string, avatar: string) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ nickname, avatar }));
  } catch { /* 無視 */ }
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none ' +
  'focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function AddMemoryForm({ location, onClose, onCreated }: Props) {
  const [nickname, setNickname]   = useState('');
  const [avatar, setAvatar]       = useState<string>(DEFAULT_AVATAR);
  const [placeName, setPlaceName] = useState('');
  const [memory, setMemory]       = useState('');
  const [year, setYear]           = useState('');
  const [age, setAge]             = useState('');
  const [hashtags, setHashtags]   = useState('');
  const [genre, setGenre]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const placeRef = useRef<HTMLInputElement>(null);

  // 端末に保存されたプロフィールを復元
  useEffect(() => {
    const p = loadProfile();
    setNickname(p.nickname);
    setAvatar(p.avatar);
  }, []);

  // 開いたら場所名にフォーカス / Esc で閉じる
  useEffect(() => {
    placeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const payload = {
      nickname, placeName, memory, year, age, hashtags, genre, avatar,
      lat: location.lat, lng: location.lng,
    };

    // 送信前にサーバーと同じ検証をかけて、無駄な往復を避ける
    const v = validateNewMemory(payload);
    if (!v.ok) { setError(v.error); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.value),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `エラーが発生しました (${res.status})`);
      saveProfile(nickname.trim(), avatar);
      onCreated(json.memory as Memory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="absolute z-40 inset-x-0 bottom-0 max-h-[65vh] md:inset-x-auto md:bottom-auto md:top-20 md:right-6 md:w-[380px] md:max-h-[calc(100vh-7rem)]"
      onContextMenu={(e) => e.stopPropagation()}
    >
      <form
        onSubmit={onSubmit}
        className="flex flex-col max-h-[inherit] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <div>
            <p className="font-bold text-gray-800">ここに思い出をのこす</p>
            <p className="text-[11px] text-gray-400 tabular-nums">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-gray-400 hover:text-gray-700 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">思い出の場所の名前 *</span>
            <input
              ref={placeRef}
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              maxLength={LIMITS.placeName}
              required
              placeholder="例: 〇〇高校のグラウンド"
              className={inputCls}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">どういう思い出？ *</span>
            <textarea
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              maxLength={LIMITS.memory}
              required
              rows={4}
              className={`${inputCls} resize-none`}
            />
            <span className="self-end text-[10px] text-gray-400 tabular-nums">
              {memory.length} / {LIMITS.memory}
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">何年の思い出？</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                maxLength={LIMITS.year}
                placeholder={String(new Date().getFullYear())}
                title={`${MIN_YEAR}〜${new Date().getFullYear()}`}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">ジャンル</span>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className={inputCls}>
                <option value="">選択しない</option>
                {GENRES.map((g) => <option key={g} value={g}>{genreLabel(g)}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">#ハッシュタグ</span>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              maxLength={LIMITS.hashtags}
              placeholder="#〇〇高校 #部活"
              className={inputCls}
            />
          </label>

          <div className="grid grid-cols-[1fr_96px] gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">あなたのあだ名 *</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={LIMITS.nickname}
                required
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">年齢</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                maxLength={LIMITS.age}
                inputMode="numeric"
                className={inputCls}
              />
            </label>
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-medium text-gray-600 mb-1">アバター</legend>
            <div className="grid grid-cols-7 gap-1">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  aria-pressed={avatar === a}
                  title={a}
                  className={`aspect-square rounded-full overflow-hidden border-2 transition ${
                    avatar === a ? 'border-blue-500 scale-110' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <Image src={`/images/avatars/${a}.png`} alt={a} width={40} height={40} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Footer */}
        <div className="border-t p-3 flex flex-col gap-2">
          {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gray-800 text-white text-sm font-bold py-2.5 hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? '送信中…' : 'のこす'}
          </button>
        </div>
      </form>
    </div>
  );
}
