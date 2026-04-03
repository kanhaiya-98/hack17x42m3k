"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

interface Stat {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

const stats: Stat[] = [
  { label: "Bots Detected Today", value: 12847, suffix: "" },
  { label: "Mule Rings Broken", value: 3, suffix: "" },
  { label: "Detection Accuracy", value: 99.2, suffix: "%", decimals: 1 },
  { label: "Response Time", value: 2, prefix: "< ", suffix: "s" },
];

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;

    const controls = animate(0, value, {
      duration: 2,
      ease: "easeOut",
      onUpdate(latest) {
        if (decimals > 0) {
          setDisplay(latest.toFixed(decimals));
        } else {
          setDisplay(Math.floor(latest).toLocaleString());
        }
      },
    });

    return () => controls.stop();
  }, [isInView, value, decimals]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default function StatsCounter() {
  return (
    <section className="relative bg-[#0a0a0f] px-6 py-20">
      {/* Top/bottom border lines */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Live Threat Intelligence
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center backdrop-blur-xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />
              <div className="relative z-10">
                <p className="mb-1 text-3xl font-bold tabular-nums text-white sm:text-4xl">
                  <AnimatedNumber
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </p>
                <p className="text-sm text-zinc-400">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
