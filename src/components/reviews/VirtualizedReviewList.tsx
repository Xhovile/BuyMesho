import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type VirtualizedReviewListProps = {
  count: number;
  estimatedItemHeight?: number;
  overscanPx?: number;
  renderItem: (index: number) => ReactNode;
};

const DEFAULT_ESTIMATED_ITEM_HEIGHT = 220;
const DEFAULT_OVERSCAN_PX = 1200;

function getWindowRange(
  offsets: number[],
  heights: number[],
  count: number,
  viewportTop: number,
  viewportBottom: number,
  overscanPx: number
) {
  const targetTop = Math.max(0, viewportTop - overscanPx);
  const targetBottom = viewportBottom + overscanPx;

  let start = 0;
  while (start < count && offsets[start] + heights[start] < targetTop) {
    start += 1;
  }

  let end = start;
  while (end < count && offsets[end] <= targetBottom) {
    end += 1;
  }

  return { start, end };
}

export default function VirtualizedReviewList({
  count,
  estimatedItemHeight = DEFAULT_ESTIMATED_ITEM_HEIGHT,
  overscanPx = DEFAULT_OVERSCAN_PX,
  renderItem,
}: VirtualizedReviewListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heightsRef = useRef<Map<number, number>>(new Map());
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [range, setRange] = useState({ start: 0, end: Math.min(count, 12) });

  const layout = useMemo(() => {
    const offsets = new Array<number>(count);
    const heights = new Array<number>(count);
    let totalHeight = 0;

    for (let index = 0; index < count; index += 1) {
      const height = heightsRef.current.get(index) ?? estimatedItemHeight;
      offsets[index] = totalHeight;
      heights[index] = height;
      totalHeight += height;
    }

    return { offsets, heights, totalHeight };
  }, [count, estimatedItemHeight, layoutVersion]);

  useEffect(() => {
    const updateRange = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerTop = container.getBoundingClientRect().top + window.scrollY;
      const viewportTop = window.scrollY - containerTop;
      const viewportBottom = viewportTop + window.innerHeight;
      const nextRange = getWindowRange(
        layout.offsets,
        layout.heights,
        count,
        viewportTop,
        viewportBottom,
        overscanPx
      );

      setRange((current) =>
        current.start === nextRange.start && current.end === nextRange.end ? current : nextRange
      );
    };

    updateRange();

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateRange);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [count, layout.heights, layout.offsets, overscanPx]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || range.start >= range.end) return;

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-virtualized-review-index]")
    );

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver((entries) => {
      let changed = false;

      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const index = Number(element.dataset.virtualizedReviewIndex);
        if (!Number.isInteger(index)) continue;

        const nextHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (!Number.isFinite(nextHeight) || nextHeight <= 0) continue;

        const previousHeight = heightsRef.current.get(index);
        if (previousHeight !== nextHeight) {
          heightsRef.current.set(index, nextHeight);
          changed = true;
        }
      }

      if (changed) {
        setLayoutVersion((current) => current + 1);
      }
    });

    rows.forEach((row) => observer.observe(row));

    return () => observer.disconnect();
  }, [range]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: layout.totalHeight }}>
      {Array.from({ length: range.end - range.start }, (_, offset) => {
        const index = range.start + offset;

        return (
          <div
            key={index}
            data-virtualized-review-index={index}
            className="absolute left-0 top-0 w-full pb-4"
            style={{ transform: `translateY(${layout.offsets[index]}px)` }}
          >
            {renderItem(index)}
          </div>
        );
      })}
    </div>
  );
}
