import * as React from "react";
import { Dots, FaceText, Line, Solid, Wire } from "@/components/iso/react/draw";
import { BACK_LAYERS, CARDS, DIAL_CAP, DRAWERS, FRONT_LAYERS, GATE_ARM_OPS, HEAD, KNOB_OPS, TOKEN_OPS, type Op } from "./geometry";

/** Draws a list of ops. Server-safe: the client only receives finished paths. */
export function Ops({ ops }: { ops: Op[] }) {
  return (
    <>
      {ops.map((op, i) => {
        switch (op.k) {
          case "halo":
            return <path key={i} className="iso-halo" d={op.d} />;
          case "solid":
            return (
              <Solid key={i} paths={op.p} tone={op.tone} crease={op.crease} lit={op.lit} flat={op.flat} inner={op.inner ? <Line d={op.inner} tone="faint" /> : undefined} />
            );
          case "line":
            return <Line key={i} d={op.d} tone={op.tone} dotted={op.dotted} dashed={op.dashed} flow={op.flow} free={op.free} />;
          case "dots":
            return <Dots key={i} points={op.pts} size={op.size} tone={op.tone} />;
          case "wire":
            return <Wire key={i} from={op.from} to={op.to} via={op.via} tone={op.tone} size={1} />;
          case "text":
            return (
              <FaceText key={i} transform={op.t} size={op.size} tone={op.tone}>
                {op.text}
              </FaceText>
            );
        }
      })}
    </>
  );
}

const layer = ({ key, part, ops }: { key: string; part: string; ops: Op[] }) => (
  <g key={key} data-part={part}>
    <Ops ops={ops} />
  </g>
);

const ALL = [...BACK_LAYERS, ...FRONT_LAYERS];
const pick = (...keys: string[]) => keys.map((key) => layer(ALL.find((l) => l.key === key)!));

/**
 * Every piece of the machine, built once and handed to the live component as
 * elements, in painter's order: the moving pieces go between the layers they sit
 * between (drawers after the chest, the needle on the dial, the arm before the near
 * pillar, the head before the near post).
 */
export const MACHINE_ART = {
  back: pick("base", "mark-hopper", "mark-gate", "mark-chest", "mark-dial", "mark-press", "mark-holdout", "drum", "chest"),
  drawers: DRAWERS.map((ops, i) => (
    <g key={`drawer-${i}`}>
      <Ops ops={ops} />
    </g>
  )),
  dial: pick("dial"),
  dialCap: (
    <g key="dial-cap">
      <Ops ops={DIAL_CAP} />
    </g>
  ),
  posts: pick("hopper-back", "gate-back", "press-back", "belt-back"),
  token: (
    <g key="token">
      <Ops ops={TOKEN_OPS} />
    </g>
  ),
  overBelt: pick("belt-front", "hopper-front"),
  arm: (
    <g key="arm">
      <Ops ops={GATE_ARM_OPS} />
    </g>
  ),
  gateFront: pick("gate-front"),
  head: (
    <g key="head">
      <Ops ops={HEAD} />
    </g>
  ),
  pressFront: pick("press-front", "switch"),
  knob: (
    <g key="knob">
      <Ops ops={KNOB_OPS} />
    </g>
  ),
  tray: pick("tray"),
  cards: CARDS.map((ops, i) => (
    <g key={`card-${i}`}>
      <Ops ops={ops} />
    </g>
  )),
};

export type MachineArt = typeof MACHINE_ART;
