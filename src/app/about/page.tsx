export default function AboutPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-center mb-12 sm:mb-16">
          Share. Watch. Vote.
        </h1>

        {/* Content Paragraph */}
        <p className="text-lg sm:text-xl text-zinc-700 dark:text-zinc-300 leading-relaxed text-center max-w-2xl mx-auto">
          Gameplay Labs was built for those moments every gamer knows — the insane kill streak, the perfectly timed play, the FIFA goal you still think about, and that wild GTA sequence you wish you could replay. After one too many clips worth saving and no great place to revisit or share them, our founder wanted something better. A place to upload your proudest gaming moments, watch what other players are pulling off, and let the community of users vote on which clips truly deserve the spotlight. No noise, no fluff — just great gameplay, shared and voted on by the people who actually play.
        </p>
      </div>
    </div>
  );
}
