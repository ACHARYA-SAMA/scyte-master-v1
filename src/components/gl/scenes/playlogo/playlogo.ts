"use client";

import { createStore } from "@/lib/store";

/** The playable logo's state, shared by the scene and the buttons beside it. */
export const playlogo = createStore({
  /** home: the exact mark; free: letters in play; returning: gliding back */
  mode: "home" as "home" | "free" | "returning",
  /** bumped by Knock it over, and by Put it back */
  knock: 0,
  reset: 0,
  throws: 0,
});
