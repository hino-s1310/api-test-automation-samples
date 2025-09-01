export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">ページが見つかりません</p>
        <p className="text-gray-500">お探しのページは存在しないか、移動された可能性があります。</p>
      </div>
    </div>
  );
}
