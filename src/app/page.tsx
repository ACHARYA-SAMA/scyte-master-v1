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
      <ProofStack />
      <Marquee />
      <ProductTeaser />
      <Services />
    </>
  );
}
