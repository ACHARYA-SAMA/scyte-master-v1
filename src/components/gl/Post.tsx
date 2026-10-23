"use client";

import { Bloom, DepthOfField, EffectComposer, FXAA, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type BloomEffect, type DepthOfFieldEffect } from "postprocessing";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Vector3 } from "three";
import { gl, useStore } from "@/lib/store";
import { postState } from "./post-state";

type Props = {
  bloom?: number;
  /** Only light above this luminance blooms: in practice, only Lumen. */
  threshold?: number;
  /** Depth of field that keeps this point sharp. Omit for no depth of field. */
  focus?: { target: Vector3; range: number; bokeh: number } | null;
  grain?: number;
  vignette?: number;
};

/**
 * The restrained post chain. Quality 2: everything, with MSAA. Quality 1: no depth of
 * field, half-resolution bloom, FXAA. Quality 0: tone mapping, bloom and FXAA only.
 *
 * Measured on an Intel UHD at 1440 x 900: SMAA's three passes cost more than the rest of
 * the chain together (home at 40 fps with it, 60 without). FXAA is one pass and holds
 * 60 fps with 2 % slow frames, against 7 % for 2x MSAA.
 */
export function Post({ bloom = 0.9, threshold = 0.85, focus = null, grain = 0.035, vignette = 0.42 }: Props) {
  const q = useStore(gl, (s) => s.quality);
  const bloomFx = useRef<BloomEffect>(null);
  const dofFx = useRef<DepthOfFieldEffect>(null);
  // the camera rig eases these: no depth of field on a resting shot, softer bloom there
  useFrame(() => {
    if (bloomFx.current) bloomFx.current.intensity = bloom * postState.bloom;
    if (dofFx.current && focus) dofFx.current.bokehScale = focus.bokeh * postState.dof;
  });
  return (
    <EffectComposer multisampling={q === 2 ? 4 : 0} enableNormalPass={false}>
      <Bloom ref={bloomFx} intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.12} mipmapBlur resolutionScale={q === 2 ? 1 : 0.5} />
      {focus && q === 2 ? <DepthOfField ref={dofFx} target={focus.target} focusRange={focus.range} bokehScale={focus.bokeh} resolutionScale={0.5} /> : <></>}
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {q > 0 ? <Vignette offset={0.32} darkness={vignette} /> : <></>}
      {q > 0 ? <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={grain * 4} /> : <></>}
      {q < 2 ? <FXAA /> : <></>}
    </EffectComposer>
  );
}
