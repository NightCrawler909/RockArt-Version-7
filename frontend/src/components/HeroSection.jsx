import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function HeroSection({ onLearnMore }) {
  const handleLearnMore = () => {
    if (typeof onLearnMore === "function") {
      onLearnMore();
    }
  };

  return (
    <section id="home" className="relative isolate overflow-hidden bg-gradient-to-b from-night-900 via-night-900 to-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-teal-400/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-24 pb-20 lg:flex-row lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="pill text-xs uppercase tracking-[0.35em] text-teal-200/80">Machine Learning Platform</p>
          <h1 className="mt-8 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Map, measure, and interpret rock art with a calm ML copilot.
          </h1>
          <p className="mt-6 text-lg text-slate-300">
            Rock Art Toolkit aligns your FastAPI pipeline with an expressive front-of-house experience.
            Surface uploads, embeddings, similarity search, and audit history without leaving the browser.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 text-sm font-semibold">
            <Link to="/dashboard" className="glow-button text-base">
              Get Started
              <ArrowRight size={18} />
            </Link>
            <button
              type="button"
              onClick={handleLearnMore}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-6 py-3 text-white/80 transition hover:border-white/40"
            >
              <PlayCircle size={20} />
              Learn More
            </button>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="card-surface w-full max-w-xl border-white/10 bg-slate-900/80"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-teal-200/70">Pipeline snapshot</p>
          <div className="mt-6 space-y-5 text-sm text-slate-300">
            {[
              { label: "Uploads in review", value: "42 pending", accent: "text-teal-300" },
              { label: "Embeddings queued", value: "128 vectors", accent: "text-cyan-300" },
              { label: "Similarity matches", value: "312 recent", accent: "text-blue-300" },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
                <span className={`${accent} text-xs font-semibold`}>Realtime</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
