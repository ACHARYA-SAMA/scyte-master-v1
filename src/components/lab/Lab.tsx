"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RotaryKnob } from "@/components/kit/RotaryKnob";
import { LeverSwitch } from "@/components/kit/LeverSwitch";
import { ToggleSwitch } from "@/components/kit/ToggleSwitch";
import { HoldToConfirm } from "@/components/kit/HoldToConfirm";
import { SplitFlapBoard } from "@/components/kit/SplitFlapBoard";
import { Odometer } from "@/components/kit/Odometer";
import { ReceiptPrinter, type ReceiptLine } from "@/components/kit/ReceiptPrinter";
import { TypeBreather } from "@/components/kit/TypeBreather";
import { LiquidFillText } from "@/components/kit/LiquidFillText";
import { BeforeAfterSlider } from "@/components/kit/BeforeAfterSlider";
import { ScrubTimeline } from "@/components/kit/ScrubTimeline";
import { Accordion } from "@/components/kit/Accordion";
import { awardStamp } from "@/lib/stamps";
import { ui } from "@/lib/store";
import styles from "./Lab.module.css";

const Bay = ({ name, use, children }: { name: string; use: string; children: ReactNode }) => (
  <section className={styles.bay} aria-label={name}>
    <header className={styles.bayHead}>
      <h2 className={styles.bayName}>{name}</h2>
      <p className={`${styles.use} t-small`}>{use}</p>
    </header>
    <div className={styles.states}>{children}</div>
  </section>
);

const State = ({ label, children }: { label: string; children: ReactNode }) => (
  <figure className={styles.state}>
    <div className={styles.stage}>{children}</div>
    <figcaption className="t-hud c-muted">{label}</figcaption>
  </figure>
);

const RECEIPT: ReceiptLine[] = [
  { kind: "title", text: "Paper trail" },
  { kind: "note", text: "Illustrative, from our business model" },
  { kind: "rule" },
  { kind: "row", left: "Messaged shoppers", right: "1,800" },
  { kind: "row", left: "Held out", right: "200" },
  { kind: "row", left: "Incremental orders", right: "43" },
  { kind: "row", left: "Incremental revenue", right: "₹64,800" },
  { kind: "rule" },
  { kind: "row", left: "Software fee", right: "−₹15,000" },
  { kind: "row", left: "Message cost", right: "−₹2,322" },
  { kind: "total", left: "Net a month", right: "₹15,078" },
  { kind: "space" },
  { kind: "note", text: "Not a client result" },
];

const FLAP_SETS = [
  ["UPI_TIMEOUT    ₹1,499", "BANK_DECLINE   ₹2,250", "USER_CANCEL    ₹899"],
  ["RECOVERED      ₹1,499", "RETRY SENT     ₹2,250", "COD OFFERED    ₹899"],
];

export function Lab() {
  const [knob, setKnob] = useState(40);
  const [small, setSmall] = useState(4);
  const [lever, setLever] = useState(0);
  const [three, setThree] = useState(1);
  const [pulls, setPulls] = useState(0);
  const [toggle, setToggle] = useState(true);
  const [held, setHeld] = useState(0);
  const [flap, setFlap] = useState(0);
  const [odo, setOdo] = useState(54400);
  const [printId, setPrintId] = useState(0);
  const [day, setDay] = useState(2);
  const rows = useMemo(() => FLAP_SETS[flap % 2]!.map((text, i) => ({ text, tone: flap % 2 && i === 0 ? ("lumen" as const) : undefined })), [flap]);

  return (
    <div className={styles.lab} data-motion-own>
      <header className={styles.head}>
        <p className="t-hud c-khaki">Round 3, development only</p>
        <h1 className={styles.title}>Component lab</h1>
        <p className={`${styles.lede} t-lead`}>Every piece of the kit with its states side by side. Each one works with a mouse, a finger and the keyboard, and stands still with reduced motion.</p>
      </header>

      <Bay name="RotaryKnob" use="Control room (P9), holdout size (P8), the speed race (S4), the type specimen (W5)">
        <State label="Default, value 40 of 100">
          <RotaryKnob label="Messageable" value={knob} min={0} max={100} step={5} onChange={setKnob} format={(v) => `${v} %`} hint="Shoppers with consent" />
        </State>
        <State label="Small, few detents">
          <RotaryKnob label="Messages a cart" value={small} min={1} max={8} step={1} onChange={setSmall} size="s" />
        </State>
        <State label="Large">
          <RotaryKnob label="Average order" value={knob * 50} min={0} max={5000} step={250} onChange={(v) => setKnob(v / 50)} size="l" format={(v) => `₹${v.toLocaleString("en-IN")}`} />
        </State>
        <State label="Disabled">
          <RotaryKnob label="Locked" value={60} min={0} max={100} step={10} onChange={() => {}} disabled />
        </State>
      </Bay>

      <Bay name="LeverSwitch" use="Margin lever and the big switch (P9), consent (P3), the closing lever (P13)">
        <State label="Two stops">
          <LeverSwitch label="Count it on" positions={["Revenue", "Margin"]} value={lever} onChange={setLever} />
        </State>
        <State label="Three stops, horizontal">
          <LeverSwitch label="Network" positions={["Slow 3G", "4G", "Fibre"]} value={three} onChange={setThree} orientation="horizontal" />
        </State>
        <State label={`Pull, spring-loaded (pulled ${pulls}×)`}>
          <LeverSwitch label="Run a pilot" positions={["Rest", "Pull"]} mode="pull" onPull={() => setPulls((n) => n + 1)} size="l" />
        </State>
        <State label="Disabled">
          <LeverSwitch label="Locked" positions={["Off", "On"]} value={1} disabled />
        </State>
      </Bay>

      <Bay name="ToggleSwitch" use="Consent, quiet hours, haptics, wireframe mode">
        <State label="On">
          <ToggleSwitch label="Consent" checked={toggle} onChange={setToggle} offLabel="No" onLabel="Yes" />
        </State>
        <State label="Off">
          <ToggleSwitch label="Quiet hours" checked={!toggle} onChange={(v) => setToggle(!v)} />
        </State>
        <State label="Disabled">
          <ToggleSwitch label="Locked" checked={false} onChange={() => {}} disabled />
        </State>
      </Bay>

      <Bay name="HoldToConfirm" use="Run the patch (P5), send (K3), approve the payment (W3)">
        <State label={`Default (confirmed ${held}×)`}>
          <HoldToConfirm onConfirm={() => setHeld((n) => n + 1)}>Hold to run the patch</HoldToConfirm>
        </State>
        <State label="Large">
          <HoldToConfirm onConfirm={() => setHeld((n) => n + 1)} size="l" doneLabel="Sent">
            Hold to send
          </HoldToConfirm>
        </State>
        <State label="Disabled">
          <HoldToConfirm onConfirm={() => {}} disabled>
            Hold to send
          </HoldToConfirm>
        </State>
      </Bay>

      <Bay name="SplitFlapBoard" use="The postmortem (H1), per-flow performance (P10)">
        <State label="Click to flip the board">
          <button type="button" onClick={() => setFlap((n) => n + 1)} className={styles.plain}>
            <SplitFlapBoard label="Failed payments" rows={rows} columns={21} />
          </button>
        </State>
        <State label="Small">
          <SplitFlapBoard label="Flow" rows={[flap % 2 ? "CART  12%" : "COD    8%"]} columns={9} size="s" />
        </State>
      </Bay>

      <Bay name="Odometer" use="The ledger (H2), the numbers (C6), the control room's result (P9)">
        <State label="Rupees, Indian grouping">
          <span className={styles.big}>
            <Odometer value={odo} prefix="₹" breathe />
          </span>
        </State>
        <State label="Change it">
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={() => setOdo((v) => v + 1)}>
              +1
            </button>
            <button type="button" className={styles.btn} onClick={() => setOdo((v) => v + 7300)}>
              +7,300
            </button>
            <button type="button" className={styles.btn} onClick={() => setOdo((v) => Math.max(0, v - 41250))}>
              −41,250
            </button>
          </div>
        </State>
        <State label="Percent, one decimal">
          <span className={styles.big}>
            <Odometer value={odo / 1000} decimals={1} suffix=" %" />
          </span>
        </State>
      </Bay>

      <Bay name="ReceiptPrinter" use="The paper trail (P9), the contact receipt (K3)">
        <State label="Print, then drag the paper up or tear it off">
          <div className={styles.col}>
            <button type="button" className={styles.btn} onClick={() => setPrintId((n) => n + 1)}>
              Print the paper trail
            </button>
            <ReceiptPrinter label="Paper trail" lines={RECEIPT} printId={printId} />
          </div>
        </State>
      </Bay>

      <Bay name="TypeBreather" use="Studio's headline (S1), Let's talk (K1)">
        <State label="Move the pointer across it, scroll fast, or wait">
          <TypeBreather as="p" className={styles.breather} text={"Let's talk."} rest={{ wght: 820, wdth: 76 }} peak={{ wght: 300, wdth: 125 }} />
        </State>
      </Bay>

      <Bay name="LiquidFillText" use="The manifesto (S9)">
        <State label="Fills as it scrolls through; sloshes with the scroll">
          <LiquidFillText className={styles.liquid} text="Fast on a budget phone." />
        </State>
      </Bay>

      <Bay name="BeforeAfterSlider" use="Review options (S8), draft against final (C4)">
        <State label="Drag, or arrow keys on the divider">
          <BeforeAfterSlider
            label="Draft against final"
            className={styles.ba}
            before={<div className={styles.swatchA}>Draft</div>}
            after={<div className={styles.swatchB}>Final</div>}
            beforeLabel="Draft"
            afterLabel="Final"
          />
        </State>
      </Bay>

      <Bay name="ScrubTimeline" use="The 14-day flight plan (P12), the timelapse (C5)">
        <State label="Drag the drop, click a stop, or arrow keys">
          <div className={styles.wide}>
            <ScrubTimeline
              label="The first fourteen days"
              index={day}
              onChange={setDay}
              stops={[
                { id: "d0", label: "Day 0", sub: "Kickoff" },
                { id: "d1", label: "Day 1–2", sub: "Install" },
                { id: "d3", label: "Day 3–4", sub: "Consent" },
                { id: "d5", label: "Day 5–7", sub: "Templates" },
                { id: "d8", label: "Day 8", sub: "Soft launch" },
                { id: "d14", label: "Day 14", sub: "First read" },
              ]}
            />
          </div>
        </State>
      </Bay>

      <Bay name="Accordion" use="Questions founders ask (S10), contact questions (K6)">
        <State label="Works without JavaScript; animates with it">
          <div className={styles.wide}>
            <Accordion
              single
              items={[
                { id: "q1", title: "Do you work with stores outside Shopify?", body: "We start with Shopify. Other platforms are scoped on a call." },
                { id: "q2", title: "Who writes the WhatsApp templates?", body: "We draft them with you, in your voice, and submit them for approval." },
                { id: "q3", title: "What if the lift is not real?", body: "Then the holdout shows it, and you should not pay for it." },
              ]}
            />
          </div>
        </State>
      </Bay>

      <Bay name="Stamp passport" use="One hidden stamp per page (G6)">
        <State label="Award a stamp, then open the passport">
          <div className={styles.row}>
            <button type="button" className={styles.btn} onClick={() => awardStamp("nightshift")}>
              Award Night shift
            </button>
            <button type="button" className={styles.btn} onClick={() => ui.set({ passportOpen: true })}>
              Open the passport
            </button>
          </div>
        </State>
      </Bay>
    </div>
  );
}
