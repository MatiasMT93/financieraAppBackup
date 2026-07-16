import { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 90;

export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pullDist = useRef(0);
  const pulling = useRef(false);
  const refreshingRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const setIndicator = (height: number, animate: boolean) => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transition = animate ? 'height 0.25s ease-out' : 'none';
    el.style.height = `${height}px`;
    const icon = el.querySelector('svg') as HTMLElement | null;
    if (icon && !refreshingRef.current) {
      const rot = Math.min((height / THRESHOLD) * 360, 360);
      icon.style.transform = `rotate(${rot}deg)`;
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshingRef.current) return;
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshingRef.current) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) {
      pulling.current = false;
      pullDist.current = 0;
      setIndicator(0, true);
      return;
    }
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      pulling.current = false;
      pullDist.current = 0;
      setIndicator(0, true);
      return;
    }
    const h = Math.min(dy * 0.5, MAX_PULL);
    pullDist.current = h;
    setIndicator(h, false);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const h = pullDist.current;
    pullDist.current = 0;

    if (h >= THRESHOLD && !refreshingRef.current) {
      refreshingRef.current = true;
      setIsRefreshing(true);
      setIndicator(THRESHOLD, true);
      const icon = indicatorRef.current?.querySelector('svg') as HTMLElement | null;
      if (icon) icon.style.transform = '';
      try {
        await Promise.all([
          onRefresh(),
          new Promise<void>((r) => setTimeout(r, 700)),
        ]);
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
        setIndicator(0, true);
      }
    } else {
      setIndicator(0, true);
    }
  }, [onRefresh]);

  return (
    <div
      ref={scrollRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={indicatorRef}
        style={{ height: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <RefreshCw
          size={22}
          className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
        />
      </div>
      {children}
    </div>
  );
}
