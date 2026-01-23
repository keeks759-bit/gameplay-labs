/**
 * Developer-friendly error page for missing environment variables
 */
export default function EnvErrorPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-12">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 dark:border-red-800 dark:bg-red-900/20">
        <h1 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-4">
          Missing Supabase Configuration
        </h1>
        <p className="text-red-800 dark:text-red-200 mb-4">
          The application requires Supabase environment variables to function.
        </p>
        <div className="space-y-2 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">Please add the following to your <code className="bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">.env.local</code> file:</p>
          <pre className="bg-red-100 dark:bg-red-900/30 p-4 rounded overflow-x-auto">
{`NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key`}
          </pre>
          <p className="mt-4">
            You can find these values in your Supabase project settings under API.
          </p>
        </div>
      </div>
    </div>
  );
}
