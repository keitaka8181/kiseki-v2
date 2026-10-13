import type { Metadata } from 'next';
import HomeScreen from '@/components/HomeScreen';

// Three.js の 3D マーカーを試せる画面（試験中の機能）。トップページ（/）は従来どおり。
export const metadata: Metadata = {
  title: 'キセキ 3D（試験中）',
  robots: { index: false }, // 試験中の画面なので検索結果には出さない
};

export default function ThreeDPage() {
  return <HomeScreen enable3D />;
}
