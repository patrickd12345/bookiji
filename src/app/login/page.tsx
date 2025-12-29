import { Suspense } from 'react';
import LoginFormContent from './LoginFormContent';

type LoginSearchParams = Record<string, string | string[] | undefined>;
type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const isPlainMode = resolvedSearchParams?.plain === '1';

  // Plain rendering mode is used for quick health checks (no client components or async work)
  if (isPlainMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-900">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Bookiji Login</h1>
          <p className="text-gray-600">Plain mode active. Remove ?plain=1 for full experience.</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
