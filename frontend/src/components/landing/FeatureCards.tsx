"use client";

import { motion } from "framer-motion";

interface Feature {
  number: string;
  title: string;
  description: string;
  owner: "Web" | "AI";
  color: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    number: "F1",
    title: "Behavioral Biometric Auth",
    description:
      "CNN-powered keystroke & mouse analysis detects bots in 4 seconds",
    owner: "AI",
    color: "#3b82f6",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.182 8.314m11.554-8.564a3 3 0 00-5.744 0m5.744 0a3 3 0 01-5.744 0" />
      </svg>
    ),
  },
  {
    number: "F3",
    title: "Network Anomaly Detection",
    description:
      "DBSCAN clustering reveals coordinated botnet attacks",
    owner: "AI",
    color: "#06b6d4",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    number: "F4",
    title: "AI Triage Engine",
    description:
      "LLM classifies threats and executes mitigation in <2 seconds",
    owner: "AI",
    color: "#8b5cf6",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    number: "F5",
    title: "Honeypot Deception Grid",
    description:
      "LLM-generated fake banking APIs trap attackers for 30+ minutes",
    owner: "AI",
    color: "#f59e0b",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    number: "F6",
    title: "Federated Threat Mesh",
    description:
      "Cross-bank model sharing with differential privacy",
    owner: "AI",
    color: "#10b981",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    number: "F7",
    title: "GNN Mule Detection",
    description:
      "GraphSAGE identifies money laundering rings in transaction graphs",
    owner: "AI",
    color: "#ef4444",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
      </svg>
    ),
  },
  {
    number: "F8",
    title: "AI Red Team Agent",
    description:
      "Autonomous attack simulation strengthens defenses continuously",
    owner: "AI",
    color: "#ec4899",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152-6.44c0-2.21-.6-4.286-1.68-6.065A4.5 4.5 0 0012 4.5a4.5 4.5 0 00-5.375-2.815A12.488 12.488 0 004.945 7.75a23.91 23.91 0 01-1.152 6.44A23.857 23.857 0 0112 12.75z" />
      </svg>
    ),
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

export default function FeatureCards() {
  return (
    <section className="relative bg-[#0a0a0f] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Defense Features
          </h2>
          <p className="mx-auto max-w-2xl text-zinc-400">
            Seven layers of AI-powered protection working in concert to
            neutralize threats before they reach your users.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-5 sm:grid-cols-2"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.number}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl transition-colors hover:border-white/[0.12] hover:bg-white/[0.05]"
            >
              {/* Glow on hover */}
              <div
                className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"
                style={{ backgroundColor: feature.color }}
              />

              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Feature number badge */}
                    <span
                      className="flex h-8 w-10 items-center justify-center rounded-lg text-xs font-bold"
                      style={{
                        backgroundColor: `${feature.color}20`,
                        color: feature.color,
                        border: `1px solid ${feature.color}30`,
                      }}
                    >
                      {feature.number}
                    </span>
                    {/* Icon */}
                    <span style={{ color: feature.color }}>
                      {feature.icon}
                    </span>
                  </div>

                  {/* Owner badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      feature.owner === "AI"
                        ? "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20"
                        : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                    }`}
                  >
                    {feature.owner}
                  </span>
                </div>

                <h3 className="mb-2 text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
