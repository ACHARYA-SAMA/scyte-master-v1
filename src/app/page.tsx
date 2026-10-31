import { HomeFilm } from "@/components/home/HomeFilm";
import { Machine } from "@/components/home/Machine";
import { Pile } from "@/components/home/Pile";
import { Tapes } from "@/components/home/Tapes";

export default function Home() {
  return (
    <>
      <HomeFilm />
      <Tapes />
      <Machine />
      <Pile />
    </>
  );
}
