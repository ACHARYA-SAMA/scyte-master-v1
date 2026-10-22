import type { Screen } from "@/data/shopper";
import styles from "./StoreMock.module.css";

/** A hoodie drawn in cells, so the store needs no photography. */
const HOODIE = [
  "....XXXXXX....",
  "...XX....XX...",
  "..XXX.XX.XXX..",
  ".XXXXXXXXXXXX.",
  "XXXXXXXXXXXXXX",
  "XX.XXXXXXXX.XX",
  "XX.XXXXXXXX.XX",
  "XX.XXX..XXX.XX",
  "XX.XXXXXXXX.XX",
  "...XXXXXXXX...",
  "...XXXXXXXX...",
];

function Hoodie() {
  return (
    <svg viewBox="0 0 14 11" className={styles.hoodie} aria-hidden>
      {HOODIE.flatMap((row, y) =>
        Array.from(row).map((c, x) => (c === "X" ? <rect key={`${x}-${y}`} x={x + 0.06} y={y + 0.06} width="0.88" height="0.88" /> : null)),
      )}
    </svg>
  );
}

export function StoreMock({ screen, consentTicked }: { screen: Screen; consentTicked: boolean }) {
  return (
    <div className={styles.browser} role="img" aria-label="Sample store, fictional">
      <div className={styles.bar} aria-hidden>
        <i />
        <i />
        <i />
        <span className={styles.url}>hoodieco.example/products/forest-hoodie</span>
      </div>
      <div className={styles.body} data-screen={screen}>
        <div className={styles.product}>
          <div className={styles.image}>
            <Hoodie />
          </div>
          <div className={styles.info}>
            <p className={styles.title}>Forest hoodie</p>
            <p className={`${styles.price} t-num`}>₹1,499</p>
            <div className={styles.sizes}>
              {["S", "M", "L", "XL"].map((s) => (
                <span key={s} data-on={s === "M" && screen !== "product" && screen !== "sizechart" ? "1" : undefined}>
                  {s}
                </span>
              ))}
            </div>
            <span className={styles.link} data-on={screen === "sizechart" ? "1" : undefined}>
              Size chart
            </span>
            <span className={styles.add} data-on={screen === "cart" ? "1" : undefined}>
              {screen === "product" || screen === "sizechart" ? "Add to cart" : "Added"}
            </span>
            <div className={styles.reviews} data-read={screen !== "product" ? "1" : undefined}>
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div className={styles.sheet} data-show={screen === "sizechart" ? "1" : undefined}>
          <p className={styles.sheetTitle}>Size chart, chest in cm</p>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>S</th>
                <td>96</td>
                <th>M</th>
                <td data-on="1">102</td>
                <th>L</th>
                <td>108</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.sheet} data-show={screen === "cart" ? "1" : undefined}>
          <p className={styles.sheetTitle}>Cart</p>
          <p className={styles.line}>
            Forest hoodie, M <span className="t-num">₹1,499</span>
          </p>
          <span className={styles.primary}>Checkout</span>
        </div>

        <div className={styles.sheet} data-show={screen === "checkout" ? "1" : undefined}>
          <p className={styles.sheetTitle}>Checkout</p>
          <label className={styles.field}>
            <span>Phone</span>
            <span className={`${styles.input} t-num`}>+91 98••• ••210</span>
          </label>
          <span className={styles.check} data-on={consentTicked ? "1" : undefined}>
            <i aria-hidden />
            Send me offers on WhatsApp. Optional, and separate from order updates.
          </span>
          <span className={styles.primary}>Pay ₹1,499 with UPI</span>
        </div>

        <div className={styles.sheet} data-show={screen === "failed" ? "1" : undefined} data-tone="alert">
          <p className={styles.sheetTitle}>Payment failed</p>
          <p className={styles.line}>The UPI request timed out. No money was taken.</p>
          <span className={styles.ghost}>Try again</span>
        </div>

        <div className={styles.sheet} data-show={screen === "report" ? "1" : undefined} data-tone="report">
          <p className={styles.sheetTitle}>Order rate, illustrative</p>
          <div className={styles.bars}>
            <span style={{ "--h": "100%" } as React.CSSProperties}>
              <b>Messaged</b>
              <em className="t-num">4.0%</em>
            </span>
            <span style={{ "--h": "40%" } as React.CSSProperties} data-hold="1">
              <b>Holdout</b>
              <em className="t-num">1.6%</em>
            </span>
          </div>
          <p className={styles.line}>Incremental: the 2.4-point difference, not the 4%.</p>
        </div>
      </div>
    </div>
  );
}
