import Link from 'next/link';

export default function ResponsibleGamblingPage() {
  return (
    <div className="prose prose-invert max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Responsible Gambling</h1>
      <p className="text-sm text-muted">Your wellbeing matters to us.</p>

      <h2 className="text-lg font-semibold">Gambling should be fun</h2>
      <p className="text-sm text-muted leading-relaxed">
        Betting on esports should be an enjoyable form of entertainment. If it stops being fun, it&apos;s
        time to take a break. Never bet more than you can afford to lose.
      </p>

      <h2 className="text-lg font-semibold">Know the signs</h2>
      <ul className="text-sm text-muted leading-relaxed space-y-1 list-disc pl-5">
        <li>Spending more time or money on gambling than intended</li>
        <li>Chasing losses or betting to recover money</li>
        <li>Neglecting responsibilities due to gambling</li>
        <li>Borrowing money to gamble</li>
        <li>Feeling anxious, irritable, or depressed about gambling</li>
        <li>Lying about gambling activity to others</li>
      </ul>

      <h2 className="text-lg font-semibold">Tools we provide</h2>
      <div className="space-y-3">
        <div className="rounded border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-1">Deposit limits</h3>
          <p className="text-xs text-muted">
            Set daily and weekly deposit limits in your{' '}
            <Link href="/settings" className="text-accent underline">
              account settings
            </Link>
            .
          </p>
        </div>
        <div className="rounded border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-1">Self-exclusion</h3>
          <p className="text-xs text-muted">
            Take a break from betting for 7 days, 30 days, 90 days, or a full year. Self-exclusion
            cannot be reversed once activated. Configure this in your{' '}
            <Link href="/settings" className="text-accent underline">
              settings
            </Link>
            .
          </p>
        </div>
        <div className="rounded border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-1">Bet history</h3>
          <p className="text-xs text-muted">
            Review your full betting history in{' '}
            <Link href="/history" className="text-accent underline">
              My Bets
            </Link>{' '}
            to stay aware of your activity.
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold">Get help</h2>
      <p className="text-sm text-muted leading-relaxed">
        If you or someone you know has a gambling problem, please reach out to these organizations:
      </p>
      <ul className="text-sm text-muted space-y-1 list-disc pl-5">
        <li>National Council on Problem Gambling: 1-800-522-4700</li>
        <li>Gamblers Anonymous: www.gamblersanonymous.org</li>
        <li>GamCare: www.gamcare.org.uk</li>
      </ul>
    </div>
  );
}
