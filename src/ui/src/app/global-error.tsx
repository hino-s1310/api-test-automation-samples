'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-red-600 mb-4">致命的なエラー</h1>
            <p className="text-xl text-gray-600 mb-4">アプリケーションで致命的なエラーが発生しました</p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              再試行
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
