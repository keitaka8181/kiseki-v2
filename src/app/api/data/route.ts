// src/app/api/data/route.ts
import { NextResponse } from 'next/server';
import { fetchMemories, insertMemory } from '@/lib/data';
import { validateNewMemory } from '@/lib/validation';

// 5分ごとに再検証（ISR相当のキャッシュ）
// ※ 投稿直後の反映はクライアント側で新規レコードを state に追加して補っている
export const revalidate = 300;

export async function GET() {
  const memories = await fetchMemories();
  return NextResponse.json({ memories, source: 'supabase' });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON を解析できませんでした' }, { status: 400 });
  }

  const v = validateNewMemory(body);
  if (!v.ok) {
    return NextResponse.json({ error: v.error }, { status: 400 });
  }

  try {
    const memory = await insertMemory(v.value);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (e) {
    console.error('[api/data] insert failed:', e);
    return NextResponse.json({ error: '投稿に失敗しました。時間をおいて再度お試しください' }, { status: 500 });
  }
}
