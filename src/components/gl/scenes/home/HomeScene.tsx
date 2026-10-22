"use client";

import { useMemo } from "react";
import { Vector3 } from "three";
import { gl, useStore } from "@/lib/store";
import { Studio } from "../../Studio";
import { Post } from "../../Post";
import { Backdrop } from "../../Backdrop";
import { GlassLogo } from "./GlassLogo";
import { Plumbing } from "./Plumbing";
import { Drops } from "./Drops";
import { Cracks } from "./Cracks";
import { Storefront } from "./Storefront";
import { Rig } from "./Rig";

/**
 * The Leak. The wordmark in green glass, plumbed together behind, with shoppers as
 * drops of light running through it. See docs/design-thesis.md, "The logo is the machine".
 */
export default function HomeScene() {
  const quality = useStore(gl, (s) => s.quality);
  const focus = useMemo(() => new Vector3(), []);
  const count = quality === 2 ? 240 : quality === 1 ? 150 : 90;
  return (
    <>
      <color attach="background" args={["#09120b"]} />
      <fog attach="fog" args={["#09120b", 90, 520]} />
      <Studio intensity={1.15} />
      <Backdrop z={-70} />
      <ambientLight intensity={0.12} color="#cfc7aa" />
      <GlassLogo />
      <Plumbing />
      <Storefront />
      <Cracks />
      <Drops count={count} />
      <Rig focus={focus} />
      <Post bloom={1.05} threshold={0.82} focus={{ target: focus, range: 42, bokeh: 1.8 }} />
    </>
  );
}
