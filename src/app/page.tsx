import { Suspense } from "react";
import { StageScene } from "@/components/stage/StageControls";
import { Hero } from "@/components/home/Hero";
import { ProofStack } from "@/components/home/ProofStack";
import { Marquee } from "@/components/home/Marquee";
import { ProductTeaser } from "@/components/home/ProductTeaser";
import { Services } from "@/components/home/Services";

export default function Home() {
  return (
    <>
      <StageScene scene="home" />
      <Hero />
      <Suspense>
        <ProofStack />
      </Suspense>
      <Suspense>
        <Marquee />
      </Suspense>
      <Suspense>
        <ProductTeaser />
      </Suspense>
      <Suspense>
        <Services />
      </Suspense>
    </>
  );
}
