'use client';

import dynamic from 'next/dynamic';

// We dynamically import the WebGL component with ssr: false here
// inside a Client Component wrapper to satisfy Next.js Server Component rules.
const WebGLOverlay = dynamic(() => import('./WebGLOverlay'), {
  ssr: false,
});

export default function GlobalCanvas() {
  return <WebGLOverlay />;
}
