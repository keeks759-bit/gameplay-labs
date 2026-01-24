export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center mb-12 sm:mb-16">
          Terms of Service
        </h1>

        {/* Content */}
        <div className="space-y-6 text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <p>
            Gameplay Labs is a community platform that allows users to upload, view, and vote on gaming clips. By accessing or using Gameplay Labs, you agree to these Terms of Service.
          </p>

          <p>
            Users are solely responsible for any content they upload, post, or share on the platform. Gameplay Labs does not review, endorse, or guarantee the accuracy, legality, or appropriateness of user-generated content.
          </p>

          <p>
            You agree not to upload or share content that is illegal, infringing, abusive, harassing, hateful, misleading, obscene, or otherwise inappropriate. You also agree not to use the platform for cheating, hacking, exploitation, harassment, or any activity that violates applicable laws or the rights of others.
          </p>

          <p>
            Gameplay Labs reserves the right, but not the obligation, to remove content, restrict access, suspend accounts, or terminate use of the platform at any time, for any reason, with or without notice.
          </p>

          <p>
            All gameplay clips remain the property of their respective owners. By uploading content, you grant Gameplay Labs a non-exclusive, royalty-free license to host, display, and distribute that content solely for operating and promoting the platform.
          </p>

          <p>
            Gameplay Labs is provided "as is" and "as available" without warranties of any kind. To the fullest extent permitted by law, Gameplay Labs disclaims all liability for user content, user conduct, service interruptions, data loss, or damages arising from use of the platform. Use of Gameplay Labs is at your own risk.
          </p>
        </div>
      </div>
    </div>
  );
}
