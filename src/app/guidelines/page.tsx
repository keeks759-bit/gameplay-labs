export const dynamic = "force-dynamic";

export default function GuidelinesPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center mb-12 sm:mb-16">
          Community Guidelines
        </h1>

        {/* Content */}
        <div className="space-y-6 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <p>
            Gameplay Labs is built for sharing great gameplay moments in a respectful, community-driven environment.
          </p>

          <p>
            Users are expected to:
          </p>

          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Share only content they own or have the right to share</li>
            <li>Treat other users with respect</li>
            <li>Avoid harassment, hate speech, abuse, or malicious behavior</li>
            <li>Avoid cheating, exploitation, or misleading content</li>
          </ul>

          <p>
            Content or behavior that violates these guidelines may be removed, and accounts may be restricted or terminated at Gameplay Labs' discretion.
          </p>
        </div>
      </div>
    </div>
  );
}
