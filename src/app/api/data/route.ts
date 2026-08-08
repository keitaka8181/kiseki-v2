// src/app/api/data/route.ts
import { NextResponse } from 'next/server';
import { fetchMemories, insertMemory } from '@/lib/data';

// 5分ごとに再検証（ISR相当のキャッシュ）
export const revalidate = 300;

export async function GET() {
  const memories = await fetchMemories();
  return NextResponse.json({ memories, source: 'supabase' });
}

// POST で新規投稿も可能（クライアントが直接Supabaseを叩く構成なら任意）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const required = ['nickname', 'placeName', 'memory', 'lat', 'lng'] as const;
    for (const k of required) {
      if (body[k] === undefined || body[k] === null || body[k] === '') {
        return NextResponse.json({ error: `${k} は必須です` }, { status: 400 });
      }
    }
    const memory = await insertMemory(body);
    return NextResponse.json({ memory }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
