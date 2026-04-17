import { Newspaper } from 'lucide-react';

export default function NewsPage() {
  return (
    <div className="flex flex-col items-start gap-4">
      <Newspaper className="h-6 w-6 text-muted" aria-hidden />
      <h1 className="text-2xl font-semibold">News</h1>
      <p className="max-w-md text-muted">
        Summaries from top esports publications will appear here. Source and summarizer are
        still to be decided (see STATUS.md).
      </p>
    </div>
  );
}
