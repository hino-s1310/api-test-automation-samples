import { redirect } from 'next/navigation';

export default function HomePage() {
  // サーバーサイドでのリダイレクト
  redirect('/upload');
}
