type OrderProgressTrackerProps = {
  stages: string[];
  activeIndex: number;
};

export default function OrderProgressTracker({
  stages,
  activeIndex,
}: OrderProgressTrackerProps) {
  return (
    <div className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle p-5 sm:p-6">
      <h2 className="text-lg font-black text-bm-text dark:text-bm-text">Progress</h2>

      <div className="mt-4 grid gap-3">
        {stages.map((stage, index) => {
          const active = index <= activeIndex;

          return (
            <div
              key={stage}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                active
                  ? 'border-bm-brand bg-bm-brand text-bm-on-brand'
                  : 'border-bm-border dark:border-bm-border bg-bm-surface text-bm-text-muted dark:text-bm-text-muted'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                  active
                    ? 'bg-bm-surface text-bm-text dark:text-bm-text'
                    : 'bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-muted dark:text-bm-text-muted'
                }`}
              >
                {index + 1}
              </div>

              <div>
                <p className="text-sm font-bold">{stage}</p>

                {index === activeIndex ? (
                  <p
                    className={`text-xs ${
                      active ? 'text-bm-on-brand' : 'text-bm-text-subtle dark:text-bm-text-subtle'
                    }`}
                  >
                    Current state
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
