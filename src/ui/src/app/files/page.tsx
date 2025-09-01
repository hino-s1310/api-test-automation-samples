import dynamic from 'next/dynamic';

const FilesPageClient = dynamic(() => import('./FilesPageClient'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default function FilesPage() {
  return <FilesPageClient />;
}
