"use client";

import { createStore } from "@/lib/store";

/** The terrain's pointer probe: the score of the ground under the pointer, or null. */
export const terrain = createStore({ probe: null as number | null });
