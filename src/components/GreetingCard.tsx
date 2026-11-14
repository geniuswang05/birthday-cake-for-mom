import { CARD } from "../config";

type GreetingCardProps = {
  open: boolean;
  onClose: () => void;
};

// Pop-up birthday card shown after the candle is blown out.
export function GreetingCard({ open, onClose }: GreetingCardProps) {
  if (!open) return null;
  return (
    <div className="greeting-backdrop" onClick={onClose}>
      <div
        className="greeting-card"
        role="dialog"
        aria-label={CARD.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="greeting-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        {CARD.photo ? (
          <img className="greeting-photo" src={CARD.photo} alt="" />
        ) : (
          <div className="greeting-deco" aria-hidden="true">🎂</div>
        )}
        <h1 className="greeting-title">{CARD.title}</h1>
        <div className="greeting-body">
          {CARD.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="greeting-sign">
          <div>{CARD.signature}</div>
          <div className="greeting-date">{CARD.date}</div>
        </div>
      </div>
    </div>
  );
}
