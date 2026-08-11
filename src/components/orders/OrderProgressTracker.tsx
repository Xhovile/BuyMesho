type OrderProgressTrackerProps = {
  stages: string[];
  activeIndex: number;
};

export default function OrderProgressTracker({
  stages,
  activeIndex,
}: OrderProgressTrackerProps) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
      <h2 className="text-lg font-black text-zinc-950">Progress</h2>

      <div className="mt-4 grid gap-3">
        {stages.map((stage, index) => {
          const active = index <= activeIndex;

          return (
            <div
              key={stage}
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                  active
                    ? 'bg-white text-zinc-900'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {index + 1}
              </div>

              <div>
                <p className="text-sm font-bold">{stage}</p>

                {index === activeIndex ? (
                  <p
                    className={`text-xs ${
                      active ? 'text-zinc-200' : 'text-zinc-500'
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
