/**
 * Analytics-ready, not hard-wired. Call track() from anywhere; nothing leaves the
 * browser until a provider is registered (for example Vercel Analytics, Plausible
 * or PostHog) in one place:
 *
 *   setAnalyticsProvider((name, props) => window.plausible?.(name, { props }));
 */

type Props = Record<string, string | number | boolean | undefined>;
type Provider = (event: string, props?: Props) => void;

let provider: Provider | null = null;

export const setAnalyticsProvider = (p: Provider | null) => {
  provider = p;
};

export const track = (event: string, props?: Props) => {
  provider?.(event, props);
};
