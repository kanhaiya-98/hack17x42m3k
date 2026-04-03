"use client";

import { motion } from "framer-motion";

interface ArchNode {
  label: string;
  sublabel: string;
  color: string;
  icon: React.ReactNode;
}

const topRow: ArchNode[] = [
  {
    label: "Browser SDK",
    sublabel: "Data Collection",
    color: "#3b82f6",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    label: "Biometric Engine",
    sublabel: "CNN Analysis",
    color: "#06b6d4",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.182 8.314m11.554-8.564a3 3 0 00-5.744 0m5.744 0a3 3 0 01-5.744 0" />
      </svg>
    ),
  },
  {
    label: "AI Triage",
    sublabel: "LLM Classification",
    color: "#8b5cf6",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
];

const actionRow: ArchNode[] = [
  {
    label: "Honeypot Trap",
    sublabel: "Deception Layer",
    color: "#f59e0b",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
      </svg>
    ),
  },
  {
    label: "MFA Challenge",
    sublabel: "Step-up Auth",
    color: "#10b981",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    label: "Terminate",
    sublabel: "Session Kill",
    color: "#ef4444",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
];

const bottomRow: ArchNode[] = [
  {
    label: "Supabase",
    sublabel: "Data Store",
    color: "#3b82f6",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    label: "Dashboard",
    sublabel: "Real-time UI",
    color: "#06b6d4",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
];

function NodeCard({ node, delay }: { node: ArchNode; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay }}
      className="group relative flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 backdrop-blur-xl transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{
          backgroundColor: `${node.color}15`,
          color: node.color,
          border: `1px solid ${node.color}25`,
        }}
      >
        {node.icon}
      </div>
      <p className="text-sm font-semibold text-white">{node.label}</p>
      <p className="text-[11px] text-zinc-500">{node.sublabel}</p>
    </motion.div>
  );
}

function Arrow({ direction = "right" }: { direction?: "right" | "down" }) {
  if (direction === "down") {
    return (
      <div className="flex justify-center py-2">
        <div className="relative h-8 w-px">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/60 to-cyan-500/20" />
          <motion.div
            className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <svg
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 text-cyan-500/60"
            fill="currentColor"
            viewBox="0 0 12 12"
          >
            <path d="M6 12L0 6h12L6 12z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-1">
      <div className="relative h-px w-8 sm:w-12">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/60 to-cyan-500/20" />
        <motion.div
          className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
          animate={{ left: ["0%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <svg
          className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-cyan-500/60"
          fill="currentColor"
          viewBox="0 0 12 12"
        >
          <path d="M12 6L6 0v12l6-6z" />
        </svg>
      </div>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <section id="architecture" className="relative bg-[#0a0a0f] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            System Architecture
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-400">
            End-to-end threat detection pipeline from data collection to
            automated response.
          </p>
        </motion.div>

        {/* Flow diagram */}
        <div className="flex flex-col items-center gap-0">
          {/* Top row: Browser SDK -> Biometric Engine -> AI Triage */}
          <div className="flex flex-wrap items-center justify-center gap-0">
            {topRow.map((node, i) => (
              <div key={node.label} className="flex items-center">
                <NodeCard node={node} delay={i * 0.15} />
                {i < topRow.length - 1 && <Arrow direction="right" />}
              </div>
            ))}
          </div>

          {/* Down arrow from AI Triage */}
          <Arrow direction="down" />

          {/* Label */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mb-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1 text-xs font-medium text-violet-400"
          >
            Threat Response Actions
          </motion.div>

          <div className="h-2" />

          {/* Middle row: Honeypot / MFA / Terminate */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {actionRow.map((node, i) => (
              <NodeCard key={node.label} node={node} delay={0.5 + i * 0.15} />
            ))}
          </div>

          {/* Down arrow */}
          <Arrow direction="down" />

          {/* Bottom row: Supabase -> Dashboard */}
          <div className="flex flex-wrap items-center justify-center gap-0">
            {bottomRow.map((node, i) => (
              <div key={node.label} className="flex items-center">
                <NodeCard node={node} delay={0.9 + i * 0.15} />
                {i < bottomRow.length - 1 && <Arrow direction="right" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
