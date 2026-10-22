import { forwardRef, type ReactNode } from "react";
import styles from "./Phone.module.css";

export type ChatMessage = {
  id: string;
  from: "brand" | "shopper" | "system";
  text: ReactNode;
  time?: string;
  buttons?: string[];
  /** Template category shown as a tiny tag, for the product explanations. */
  tag?: string;
};

type Props = {
  brand?: string;
  time?: string;
  messages: ChatMessage[];
  typing?: boolean;
  className?: string;
  /** Content rendered over the chat (consent sheets, overlays). */
  overlay?: ReactNode;
  label?: string;
};

/**
 * A hand-built, generic messaging UI. Deliberately not WhatsApp's branding: no logo,
 * no green; the site palette only.
 */
export const Phone = forwardRef<HTMLDivElement, Props>(function Phone(
  { brand = "Your store", time = "15:05", messages, typing, className, overlay, label },
  ref,
) {
  return (
    <div ref={ref} className={`${styles.phone} ${className ?? ""}`} role="img" aria-label={label ?? "Chat preview"}>
      <div className={styles.screen}>
        <div className={styles.status} aria-hidden>
          <span className="t-num">{time}</span>
          <span className={styles.signal}>
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={styles.header}>
          <span className={styles.avatar} aria-hidden>
            {brand.slice(0, 1)}
          </span>
          <span className={styles.who}>
            <strong>{brand}</strong>
            <small>Business account</small>
          </span>
        </div>
        <ol className={styles.thread}>
          {messages.map((m) => (
            <li key={m.id} className={styles.msg} data-from={m.from} data-msg={m.id}>
              {m.from === "system" ? (
                <p className={styles.system}>{m.text}</p>
              ) : (
                <>
                  <div className={styles.bubble}>
                    {m.tag ? <span className={styles.tag}>{m.tag}</span> : null}
                    <p>{m.text}</p>
                    {m.time ? <span className={`${styles.time} t-num`}>{m.time}</span> : null}
                  </div>
                  {m.buttons?.length ? (
                    <div className={styles.buttons}>
                      {m.buttons.map((b) => (
                        <span key={b} className={styles.button}>
                          {b}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </li>
          ))}
          {typing ? (
            <li className={styles.msg} data-from="brand" aria-hidden>
              <div className={`${styles.bubble} ${styles.typing}`}>
                <i />
                <i />
                <i />
              </div>
            </li>
          ) : null}
        </ol>
        {overlay ? <div className={styles.overlay}>{overlay}</div> : null}
      </div>
    </div>
  );
});
