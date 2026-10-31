import { MACHINE_ART } from "@/components/figures/recovery/art";
import { MachineLive } from "@/components/figures/recovery/live";

/** The anatomy band. The machine's paths are built here, on the server; only its motion ships. */
export function Machine() {
  return <MachineLive art={MACHINE_ART} />;
}
