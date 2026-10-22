"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { ScrollTrigger } from "@/lib/motion";
import { ui } from "@/lib/store";
import { recordPage } from "@/lib/telemetry";
import { track } from "@/lib/analytics";
import { scrollToTop } from "@/components/providers/SmoothScroll";
import { curtain, expectRoute, routeCommitted } from "./curtainControl";

const ROUTE_LABELS: Record<string, string> = {
  "/": "home",
  "/product": "the product",
  "/services": "the studio",
  "/work": "work",
  "/team": "the team",
  "/contact": "contact",
};

const labelFor = (href: string) => {
  const path = href.split(/[?#]/)[0] || "/";
  return `Loading ${ROUTE_LABELS[path] ?? path}`;
};

/** Navigate behind the cell curtain. Falls back to a plain push if a transition is running. */
export const useTransitionRouter = () => {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    async (href: string, origin?: { x: number; y: number }) => {
      const path = href.split(/[?#]/)[0] || "/";
      if (path === pathname) {
        const hash = href.split("#")[1];
        if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        else scrollToTop();
        return;
      }
      if (ui.get().transition !== "idle") {
        router.push(href);
        return;
      }
      track("navigate", { to: path });
      ui.set({ transition: "covering", menuOpen: false });
      const o = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      await curtain.cover(o, labelFor(href));
      ui.set({ transition: "covered" });
      const committed = expectRoute(path);
      router.push(href, { scroll: false });
      await committed;
      // Let the new page lay out and its fonts settle before measuring triggers.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      scrollToTop();
      ScrollTrigger.refresh();
      ui.set({ transition: "revealing" });
      await curtain.reveal();
      ui.set({ transition: "idle" });
    },
    [pathname, router],
  );
};

type TransitionLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & { children?: React.ReactNode };

/** next/link with the cell curtain. Modified clicks and external links behave natively. */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(function TransitionLink(
  { href, onClick, children, ...rest },
  ref,
) {
  const go = useTransitionRouter();
  const target = typeof href === "string" ? href : (href.pathname ?? "/");

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (rest.target === "_blank") return;
    e.preventDefault();
    void go(target, { x: e.clientX || window.innerWidth / 2, y: e.clientY || window.innerHeight / 2 });
  };

  return (
    <Link ref={ref} href={href} onClick={handle} {...rest}>
      {children}
    </Link>
  );
});

/** Resolves curtain navigations and records page views for the visit readout. */
export function RouteWatcher() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    recordPage(pathname);
    if (first.current) {
      first.current = false;
      return;
    }
    if (!routeCommitted(pathname)) {
      // Back/forward or a plain link: no curtain, but triggers still need fresh measurements.
      requestAnimationFrame(() => ScrollTrigger.refresh());
    }
  }, [pathname]);

  return null;
}
