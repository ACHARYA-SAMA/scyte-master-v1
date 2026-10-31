"use client";

import { useMemo, useRef } from "react";
import { Vector2, Vector3 } from "three";
import { Bloom, ChromaticAberration, DepthOfField, EffectComposer, FXAA, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { gl, useStore } from "@/lib/store";
import { Dust } from "../../Dust";
import { C } from "../../materials";
import { Rig, type PostRefs } from "./Camera";
import { devOff } from "./film";
import { Gate } from "./Gate";
import { Stream } from "./Stream";
import { Fork } from "./Fork";

const fxOff = devOff;

/**
 * The home film. One camera, three sets, joined by cuts hidden in light: the gate
 * (a doorway of light on still water at dawn, shoppers pouring through it as drops of
 * light), the stream (inside the pipe, flying with the light), and the fork (the Y as
 * a building, where payments fail, light falls out, and the playbooks seal the
 * cracks). The camera comes back out of the gate to see it fully lit.
 */
export default function HomeScene() {
  const quality = useStore(gl, (s) => s.quality);
  const post = useRef<PostRefs>({ bloom: null, ca: null, dof: null });
  const focus = useMemo(() => new Vector3(), []);
  const caOffset = useMemo(() => new Vector2(), []);
  const q2 = quality === 2;

  return (
    <>
      <color attach="background" args={["#060c08"]} />
      <Rig post={post} focus={focus} />
      <Gate />
      <Stream />
      <Fork />
      {devOff("dust") ? null : <Dust count={quality === 2 ? 1600 : quality === 1 ? 1000 : 500} box={110} color={C.cream} gain={0.9} />}
      <EffectComposer multisampling={q2 ? 4 : 0} enableNormalPass={false}>
        {/* the same bloom as the junction's: a tight threshold and a short radius. Wider and
            lower settings left a dark ring round the brightest lights on integrated GPUs */}
        {fxOff("bloom") ? <></> : <Bloom ref={(e) => void (post.current.bloom = e)} intensity={1.3} luminanceThreshold={1.0} luminanceSmoothing={0.1} mipmapBlur radius={0.62} levels={5} resolutionScale={q2 ? 1 : 0.5} />}
        {q2 ? <DepthOfField ref={(e) => void (post.current.dof = e)} target={focus} focusRange={60} bokehScale={1.4} resolutionScale={0.5} /> : <></>}
        {fxOff("ca") ? <></> : <ChromaticAberration ref={(e) => void (post.current.ca = e)} offset={caOffset} radialModulation modulationOffset={0.25} />}
        {fxOff("tone") ? <></> : <ToneMapping mode={ToneMappingMode.NEUTRAL} />}
        {fxOff("vig") ? <></> : <Vignette offset={0.2} darkness={0.74} />}
        {quality > 0 && !fxOff("noise") ? <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} /> : <></>}
        {q2 ? <></> : <FXAA />}
      </EffectComposer>
    </>
  );
}
