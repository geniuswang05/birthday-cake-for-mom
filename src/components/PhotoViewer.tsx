import { useEffect, useRef } from "react";

type PhotoViewerProps = {
  photos: ReadonlyArray<string>;
  index: number | null;
  onChange: (index: number | null) => void;
};

// Full-screen viewer for one photo, with previous / next and swipe on phones.
export function PhotoViewer({ photos, index, onChange }: PhotoViewerProps) {
  const touchX = useRef<number | null>(null);
  const open = index !== null;
  const count = photos.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!["Escape", "ArrowRight", "ArrowLeft", " "].includes(e.key)) return;
      // the viewer owns these keys while open (don't also close the film scroll
      // underneath or blow out the candle)
      e.stopImmediatePropagation();
      if (e.key === "Escape") onChange(null);
      if (e.key === "ArrowRight") onChange(((index ?? 0) + 1) % count);
      if (e.key === "ArrowLeft") onChange(((index ?? 0) - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, index, count, onChange]);

  if (!open) return null;
  const go = (step: number) => onChange((index + step + count) % count);

  return (
    <div
      className="viewer-backdrop"
      onClick={() => onChange(null)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <img
        className="viewer-photo"
        src={photos[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <button className="viewer-close" onClick={() => onChange(null)} aria-label="关闭">
        ×
      </button>
      {count > 1 && (
        <>
          <button
            className="viewer-nav viewer-prev"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="上一张"
          >
            ‹
          </button>
          <button
            className="viewer-nav viewer-next"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="下一张"
          >
            ›
          </button>
          <div className="viewer-count">
            {index + 1} / {count}
          </div>
        </>
      )}
    </div>
  );
}
