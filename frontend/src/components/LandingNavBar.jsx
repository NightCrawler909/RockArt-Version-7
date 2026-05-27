import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const navItems = [
  { label: "Home", target: "home", type: "anchor" },
  { label: "Features", target: "features", type: "anchor" },
  { label: "Workflow", target: "workflow", type: "anchor" },
  { label: "Model Flow", target: "model-flow", type: "anchor" },
  { label: "Dashboard", target: "/dashboard", type: "route", variant: "primary" },
];

export default function LandingNavBar({ onNavigate }) {
  const handleAnchorNav = (target) => {
    if (typeof onNavigate === "function") {
      onNavigate(target);
    }
  };

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="sticky top-0 z-30 border-b border-white/5 bg-night-900/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-lg font-semibold tracking-wider text-white">
          Rock Art Toolkit
        </div>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          {navItems.map(({ label, target, type, variant }) =>
            type === "anchor" ? (
              <button
                key={label}
                type="button"
                onClick={() => handleAnchorNav(target)}
                className="rounded-full border border-transparent px-4 py-1.5 text-slate-300 transition hover:border-white/30 hover:text-white"
              >
                {label}
              </button>
            ) : (
              <Link
                key={label}
                to={target}
                className={
                  variant === "primary"
                    ? "glow-button px-5 py-2 text-sm"
                    : "rounded-full border border-white/15 px-5 py-2 text-sm text-slate-200 transition hover:border-white/40 hover:text-white"
                }
              >
                {label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </motion.header>
  );
}
