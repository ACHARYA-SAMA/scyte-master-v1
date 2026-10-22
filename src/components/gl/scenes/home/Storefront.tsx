"use client";

import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { MeshBasicMaterial } from "three";
import { canvasTexture, makeMetal, siteFont } from "../../materials";
import { STORE } from "./paths";

const W = 1600;
const H = 1000;

/** A fictional store's product page, drawn once at screen resolution. */
const drawStore = (ctx: CanvasRenderingContext2D) => {
  const f = (w: number, size: number) => `${w} ${size}px ${siteFont()}`;
  ctx.fillStyle = "#e6d5b8";
  ctx.fillRect(0, 0, W, H);
  // bar
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(0, 0, W, 86);
  ctx.fillStyle = "#e6d5b8";
  ctx.font = f(700, 34);
  ctx.fillText("Demo store", 56, 56);
  ctx.font = f(500, 24);
  ctx.fillStyle = "#c2b897";
  ctx.fillText("Not a real shop", 280, 56);
  ctx.fillText("Cart (0)", W - 180, 56);
  // product image: an oat hoodie, drawn flat
  ctx.fillStyle = "#cfc7aa";
  ctx.fillRect(56, 140, 760, 800);
  ctx.fillStyle = "#c2b897";
  ctx.beginPath();
  ctx.moveTo(300, 300);
  ctx.lineTo(380, 250);
  ctx.quadraticCurveTo(436, 300, 492, 250);
  ctx.lineTo(572, 300);
  ctx.lineTo(680, 430);
  ctx.lineTo(620, 480);
  ctx.lineTo(572, 420);
  ctx.lineTo(572, 820);
  ctx.lineTo(300, 820);
  ctx.lineTo(300, 420);
  ctx.lineTo(252, 480);
  ctx.lineTo(192, 430);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#929884";
  ctx.fillRect(360, 640, 152, 70);
  ctx.strokeStyle = "#929884";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(380, 250);
  ctx.quadraticCurveTo(436, 360, 492, 250);
  ctx.stroke();
  // copy
  ctx.fillStyle = "#1b261d";
  ctx.font = f(800, 64);
  ctx.fillText("Heavyweight", 880, 230);
  ctx.fillText("hoodie, oat", 880, 300);
  ctx.font = f(600, 44);
  ctx.fillText("₹1,499", 880, 390);
  ctx.font = f(500, 26);
  ctx.fillStyle = "#334638";
  ctx.fillText("Size", 880, 470);
  ["S", "M", "L", "XL"].forEach((s, i) => {
    const x = 880 + i * 112;
    ctx.strokeStyle = "#1b261d";
    ctx.lineWidth = 3;
    if (s === "M") {
      ctx.fillStyle = "#1b261d";
      ctx.fillRect(x, 490, 92, 70);
      ctx.fillStyle = "#e6d5b8";
    } else {
      ctx.strokeRect(x, 490, 92, 70);
      ctx.fillStyle = "#1b261d";
    }
    ctx.font = f(700, 30);
    ctx.fillText(s, x + 46 - ctx.measureText(s).width / 2, 536);
  });
  ctx.fillStyle = "#334638";
  ctx.font = f(500, 26);
  ctx.fillText("Size chart", 880, 610);
  ctx.fillRect(880, 618, 118, 2);
  ctx.fillStyle = "#1b261d";
  ctx.fillRect(880, 660, 640, 96);
  ctx.fillStyle = "#e6d5b8";
  ctx.font = f(700, 34);
  ctx.fillText("Add to cart", 1110, 720);
  ctx.fillStyle = "#334638";
  ctx.font = f(500, 26);
  ctx.fillText("Reviews", 880, 820);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#cfc7aa";
    ctx.fillRect(880, 846 + i * 34, 640 - i * 120, 14);
  }
};

/**
 * A generic laptop showing a fictional store, where the drops come from. Brushed
 * dark metal, no brand marks.
 */
export function Storefront() {
  const metal = useMemo(() => makeMetal("#253026", 0.3), []);
  const screen = useMemo(() => new MeshBasicMaterial({ map: canvasTexture(W, H, drawStore), toneMapped: false }), []);
  useEffect(
    () => () => {
      metal.dispose();
      screen.map?.dispose();
      screen.dispose();
    },
    [metal, screen],
  );
  const { position } = STORE;
  return (
    <group position={position} rotation={[0.08, 0.32, 0]}>
      {/* lid */}
      <group position={[0, 1.6, 0]} rotation={[-0.16, 0, 0]}>
        <RoundedBox args={[24, 15.4, 0.7]} radius={0.5} smoothness={4} position={[0, 7.7, -0.35]} material={metal} />
        <mesh position={[0, 7.7, 0.02]} material={screen}>
          <planeGeometry args={[22.6, 14.1]} />
        </mesh>
      </group>
      {/* base */}
      <RoundedBox args={[25, 1.1, 16]} radius={0.45} smoothness={4} position={[0, 0.9, 7.6]} material={metal} />
    </group>
  );
}
