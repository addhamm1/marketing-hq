import type { CSSProperties } from "react";
import styles from "./confetti.module.css";

const TONES = ["var(--primary)", "var(--warning)", "var(--destructive)", "var(--success)", "var(--brand-charcoal)"];
const PIECES = 18;

/** One short fall of confetti, drawn by CSS alone. Hidden for people who prefer reduced motion. */
export function Confetti() {
  return (
    <div className={styles.confetti} aria-hidden data-testid="confetti">
      {Array.from({ length: PIECES }, (_, i) => (
        <span
          key={i}
          className={styles.piece}
          // Spread by index, so the server and the browser draw the same thing.
          style={
            {
              "--at": `${(i * 37 + 5) % 100}%`,
              "--delay": `${(i * 70) % 600}ms`,
              "--drift": `${((i * 23) % 60) - 30}px`,
              "--spin": `${180 + ((i * 47) % 360)}deg`,
              "--tone": TONES[i % TONES.length],
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
