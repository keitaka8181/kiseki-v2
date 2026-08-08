// src/app/submit/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NewMemoryInput } from '@/lib/data';

const AVATARS = ['boy', 'girl', 'sporty-boy', 'sporty-girl', 'adult-man', 'adult-woman'];
const GENRES = [
  'ADVENTURE 迷子になった道、チャレンジした体験、道なき道を行く記録。',
  'MEMORY 大切な人、忘れられない出来事、懐かしい風景。',
  'DISCOVERY 初めての発見、心を動かされた瞬間。',
];

export default function SubmitPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const fd = new FormData(e.currentTarget);

    // "緯度, 経度" をパース
    const latLngRaw = String(fd.get('latLng') ?? '');
    const parts = latLngRaw.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
      setErrorMsg('緯度経度は「35.6302, 139.8915」の形式で入力してください');
      setStatus('error');
      return;
    }

    const payload: NewMemoryInput = {
      nickname:  String(fd.get('nickname') ?? '').trim(),
      placeName: String(fd.get('placeName') ?? '').trim(),
      memory:     String(fd.get('memory') ?? '').trim(),
      lat:       parts[0],
      lng:       parts[1],
      age:       String(fd.get('age') ?? ''),
      avatar:    String(fd.get('avatar') ?? 'boy'),
      hashtags:  String(fd.get('hashtags') ?? ''),
      genre:     String(fd.get('genre') ?? ''),
      year:      String(fd.get('year') ?? ''),
    };

    try {
      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `status ${res.status}`);
      }
      setStatus('done');
      // 2秒後にトップへ
      setTimeout(() => router.push('/'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'エラーが発生しました');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">投稿ありがとうございました！</h1>
        <p>まもなく地図に戻ります…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-bold mb-6">思い出を投稿する</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span>あなたのあだ名 *</span>
          <input name="nickname" required maxLength={100} className="border rounded px-2 py-1" />
        </label>

        <label className="flex flex-col gap-1">
          <span>思い出の場所の名前 *</span>
          <input name="placeName" required maxLength={200} className="border rounded px-2 py-1" />
        </label>

        <label className="flex flex-col gap-1">
          <span>どういう思い出？ *</span>
          <textarea name="memory" required maxLength={2000} rows={4} className="border rounded px-2 py-1" />
        </label>

        <label className="flex flex-col gap-1">
          <span>緯度経度 * <small className="text-gray-500">例: 35.6302, 139.8915</small></span>
          <input name="latLng" required className="border rounded px-2 py-1" placeholder="35.6302, 139.8915" />
        </label>

        <label className="flex flex-col gap-1">
          <span>あなたはおいくつ？</span>
          <input name="age" className="border rounded px-2 py-1" />
        </label>

        <label className="flex flex-col gap-1">
          <span>アバター</span>
          <select name="avatar" className="border rounded px-2 py-1">
            {AVATARS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span>#ハッシュタグ（スペース区切りで複数可）</span>
          <input name="hashtags" className="border rounded px-2 py-1" placeholder="#〇〇高校 #部活" />
        </label>

        <label className="flex flex-col gap-1">
          <span>ジャンル</span>
          <select name="genre" className="border rounded px-2 py-1">
            <option value="">選択しない</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span>西暦で何年の思い出？</span>
          <input name="year" className="border rounded px-2 py-1" placeholder="2023" />
        </label>

        {errorMsg && <p className="text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="mt-4 rounded bg-blue-600 text-white py-2 disabled:opacity-50"
        >
          {status === 'submitting' ? '送信中…' : '送信する'}
        </button>
      </form>
    </main>
  );
}
