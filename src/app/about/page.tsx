import AtomIcon from "@/components/AtomIcon";

export const dynamic = "force-dynamic";

export default function AboutPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-center mb-12 sm:mb-16">
          <span className="text-blue-600 dark:text-blue-400">Share.</span>{' '}
          <span className="text-red-600 dark:text-red-400">Watch.</span>{' '}
          <span className="text-green-600 dark:text-green-400">Vote.</span>{' '}
          <AtomIcon className="inline-block align-middle h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14" />
        </h1>

        {/* Content Paragraphs */}
        <div className="space-y-6">
          <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed text-center max-w-2xl mx-auto">
            Gameplay Labs was built for those moments every gamer knows. The clutch play that turns a match, the sequence you didn't think was possible, the highlight you keep replaying in your head.
          </p>
          <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed text-center max-w-2xl mx-auto">
            After saving clip after clip with no great place to revisit or share them, we wanted something better. A home for gameplay moments that deserve to be seen again, whether it's a cracked FPS run, a last-second game-winner, or a perfectly executed open-world sequence.
          </p>
          <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed text-center max-w-2xl mx-auto">
            Gameplay Labs is a community-driven platform where players upload their best moments, discover what others are pulling off, and vote on the clips that truly stand out. No algorithms. No gimmicks. Just great gameplay, surfaced by the people who appreciate it most: other gamers.
          </p>
        </div>

        {/* Build Status Paragraph */}
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed text-center max-w-2xl mx-auto mt-8">
          Gameplay Labs is currently in active build. We're focused on getting the fundamentals right and continuing to improve the experience based on real community use. If you notice something that could be better or have ideas to share, you can reach us directly at <a href="mailto:support@gameplaylabs.io" className="text-zinc-900 dark:text-zinc-100 underline hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">support@gameplaylabs.io</a>. We read everything as we keep building.
        </p>
      </div>
    </div>
  );
}
