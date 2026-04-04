"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export default function Globe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let width = 0;
    
    // Scale for responsive sizing
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1, // 1 is dark mode
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 3,
      baseColor: [0.1, 0.1, 0.15],
      markerColor: [0, 220 / 255, 130 / 255],
      glowColor: [0, 100 / 255, 255 / 255],
      markers: [
        // Simulated network nodes / satellites (major financial hubs)
        { location: [19.0760, 72.8777], size: 0.1 },  // Mumbai
        { location: [28.7041, 77.1025], size: 0.08 }, // Delhi
        { location: [1.3521, 103.8198], size: 0.08 }, // Singapore
        { location: [51.5072, -0.1276], size: 0.06 }, // London
        { location: [40.7128, -74.0060], size: 0.08 },// New York
        { location: [35.6762, 139.6503], size: 0.06 },// Tokyo
      ],
      // @ts-expect-error - Cobe types sometimes missing onRender
      onRender: (state: Record<string, any>) => {
        // Revolving effect
        state.phi = phi;
        phi += 0.003;
        
        // Auto-sizing
        if (canvasRef.current) {
            state.width = canvasRef.current.offsetWidth * 2;
            state.height = canvasRef.current.offsetWidth * 2;
        }
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square flex items-center justify-center m-auto opacity-70 mt-10 md:mt-0">
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "600px",
          maxHeight: "600px",
          contain: "layout paint size",
          cursor: "grab",
        }}
      />
    </div>
  );
}
