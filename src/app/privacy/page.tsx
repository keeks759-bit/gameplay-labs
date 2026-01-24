export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center mb-12 sm:mb-16">
          Privacy Policy
        </h1>

        {/* Content */}
        <div className="space-y-6 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <p>
            Gameplay Labs respects your privacy. This Privacy Policy explains how we collect, use, and protect information when you use the platform.
          </p>

          <p>
            We may collect basic information such as account details, uploaded content, usage data, and technical information required to operate and improve the service. Gameplay Labs does not sell personal data.
          </p>

          <p>
            Information is used solely to operate the platform, improve functionality, maintain security, and communicate with users when necessary.
          </p>

          <p>
            Gameplay Labs may use third-party services (such as hosting, analytics, or authentication providers) that process limited data on our behalf. These services are used only to support platform operations.
          </p>

          <p>
            By using Gameplay Labs, you consent to the collection and use of information as described in this policy.
          </p>
        </div>
      </div>
    </div>
  );
}
