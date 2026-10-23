"use client";

import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import { haptic } from "@/lib/prefs";
import styles from "./app.module.css";

const PRODUCTS = [
  { id: "hoodie", name: "Hoodie, oat", price: 1499, tone: "#c2b897" },
  { id: "tee", name: "Tee, moss", price: 799, tone: "#334638" },
  { id: "crew", name: "Crew, cream", price: 1199, tone: "#e6d5b8" },
  { id: "cap", name: "Cap, ground", price: 599, tone: "#2b3a2f" },
];

type Tab = "home" | "search" | "cart" | "you";
type View = { tab: Tab; product: string | null };

const inr = (n: number) => `₹${new Intl.NumberFormat("en-IN").format(n)}`;

/**
 * A working app prototype: tabs, a list you can pull to refresh, a product page that
 * slides in with a swipeable gallery, a cart with a badge. Fictional store.
 */
export function AppPrototype() {
  const [view, setView] = useState<View>({ tab: "home", product: null });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [size, setSize] = useState("M");
  const [slide, setSlide] = useState(0);
  const [pull, setPull] = useState(0);
  const [refreshed, setRefreshed] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; mode: "pull" | "swipe" | null }>({ x: 0, y: 0, mode: null });

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const product = PRODUCTS.find((p) => p.id === view.product) ?? null;

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 1600);
    return () => window.clearTimeout(t);
  }, [notice]);

  const go = (tab: Tab) => {
    setView({ tab, product: null });
    sfx.tick();
  };

  const add = () => {
    if (!product) return;
    setCart((c) => ({ ...c, [product.id]: (c[product.id] ?? 0) + 1 }));
    setNotice(`Added ${product.name}, ${size}`);
    sfx.ok();
    haptic(12);
  };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, mode: null };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (e.buttons === 0) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.mode) d.mode = Math.abs(dy) > Math.abs(dx) ? "pull" : "swipe";
    if (d.mode === "pull" && view.tab === "home" && !product && (list.current?.scrollTop ?? 0) <= 0) setPull(Math.max(0, Math.min(70, dy * 0.5)));
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    const dx = e.clientX - d.x;
    if (d.mode === "pull" && pull > 50) {
      setRefreshed(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
      sfx.ok();
      haptic(10);
    }
    if (d.mode === "swipe" && product && Math.abs(dx) > 40) setSlide((s) => Math.max(0, Math.min(2, s + (dx < 0 ? 1 : -1))));
    setPull(0);
    drag.current.mode = null;
  };

  return (
    <div className={styles.app} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* home and the other tabs */}
      <div className={styles.page} data-under={product ? "1" : undefined}>
        <header className={styles.bar}>
          <b>{view.tab === "home" ? "Demo store" : view.tab === "search" ? "Search" : view.tab === "cart" ? "Cart" : "You"}</b>
          <span className="t-hud">Prototype</span>
        </header>
        <div ref={list} className={styles.body} data-lenis-prevent>
          {view.tab === "home" ? (
            <>
              <div className={styles.pull} style={{ height: pull }} aria-hidden>
                <span data-ready={pull > 50 ? "1" : undefined}>{pull > 50 ? "Release to refresh" : "Pull to refresh"}</span>
              </div>
              {refreshed ? <p className={`${styles.updated} t-hud`}>Updated {refreshed}</p> : null}
              <p className={styles.section}>New this week</p>
              <div className={styles.grid}>
                {PRODUCTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.item}
                    onClick={() => {
                      setView((v) => ({ ...v, product: p.id }));
                      setSlide(0);
                      sfx.tick();
                    }}
                    data-cursor="tap"
                  >
                    <span className={styles.thumb} style={{ background: p.tone }} aria-hidden />
                    <span className={styles.itemName}>{p.name}</span>
                    <span className={styles.itemPrice}>{inr(p.price)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {view.tab === "search" ? (
            <div className={styles.empty}>
              <span className={styles.field}>Search the store</span>
              <p>Try “hoodie”. Search is a stub in this prototype.</p>
            </div>
          ) : null}
          {view.tab === "cart" ? (
            count === 0 ? (
              <div className={styles.empty}>
                <p>Your cart is empty. Add something from Home.</p>
                <button type="button" className={styles.primary} onClick={() => go("home")}>
                  Browse the drop
                </button>
              </div>
            ) : (
              <div className={styles.cartList}>
                {PRODUCTS.filter((p) => cart[p.id]).map((p) => (
                  <div key={p.id} className={styles.cartRow}>
                    <span className={styles.thumbSm} style={{ background: p.tone }} aria-hidden />
                    <span>{p.name}</span>
                    <span className={styles.qty}>
                      <button type="button" aria-label={`One fewer ${p.name}`} onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}>
                        −
                      </button>
                      <b>{cart[p.id]}</b>
                      <button type="button" aria-label={`One more ${p.name}`} onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}>
                        +
                      </button>
                    </span>
                  </div>
                ))}
                <p className={styles.total}>
                  Total <b>{inr(PRODUCTS.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0))}</b>
                </p>
                <button type="button" className={styles.primary} onClick={() => setNotice("Checkout is where the store's own payment page opens")}>
                  Checkout
                </button>
              </div>
            )
          ) : null}
          {view.tab === "you" ? (
            <div className={styles.empty}>
              <p>Orders, addresses and notifications live here.</p>
            </div>
          ) : null}
        </div>
        <nav className={styles.tabs} aria-label="App tabs">
          {(["home", "search", "cart", "you"] as Tab[]).map((t) => (
            <button key={t} type="button" aria-current={view.tab === t ? "page" : undefined} onClick={() => go(t)} data-cursor="tap">
              <span className={styles.tabIcon} data-tab={t} aria-hidden />
              <span>{t === "you" ? "You" : t[0].toUpperCase() + t.slice(1)}</span>
              {t === "cart" && count > 0 ? <i className={styles.badge}>{count}</i> : null}
            </button>
          ))}
        </nav>
      </div>

      {/* the product page slides over */}
      <div className={styles.detail} data-open={product ? "1" : undefined} aria-hidden={!product}>
        {product ? (
          <>
            <header className={styles.bar}>
              <button type="button" className={styles.back} onClick={() => setView((v) => ({ ...v, product: null }))} data-cursor="tap">
                Back
              </button>
              <span className="t-hud">Swipe the photos</span>
            </header>
            <div className={styles.gallery} data-cursor="drag" data-cursor-label="Swipe">
              <div className={styles.slides} style={{ transform: `translateX(${-slide * 100}%)` }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={styles.slide} style={{ background: product.tone }}>
                    <i style={{ transform: `rotate(${i * 8 - 8}deg) scale(${1 - i * 0.08})` }} />
                  </span>
                ))}
              </div>
              <span className={styles.dots}>
                {[0, 1, 2].map((i) => (
                  <i key={i} data-on={i === slide ? "1" : undefined} />
                ))}
              </span>
            </div>
            <div className={styles.info}>
              <p className={styles.dName}>{product.name}</p>
              <p className={styles.dPrice}>{inr(product.price)}</p>
              <div className={styles.sizes} role="radiogroup" aria-label="Size">
                {["S", "M", "L", "XL"].map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => setSize(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" className={styles.primary} onClick={add} data-cursor="tap">
                Add to cart
              </button>
            </div>
          </>
        ) : null}
      </div>
      {notice ? (
        <p className={styles.toast} role="status">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
