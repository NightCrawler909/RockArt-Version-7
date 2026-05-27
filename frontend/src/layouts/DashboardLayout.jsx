import { Outlet, NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Archive,
  Cpu,
  LayoutDashboard,
  Layers,
  Search,
  Settings,
  Sparkles,
  Tags,
  UploadCloud,
} from "lucide-react";
import { usePipeline } from "../context/PipelineContext.jsx";

const NAV_ITEMS = [
  { label: "Dashboard", to: "overview", icon: LayoutDashboard },
  { label: "Upload & Process", to: "upload", icon: UploadCloud },
  { label: "Segment & Embed", to: "segment", icon: Layers },
  { label: "Batch Labeling", to: "labeling", icon: Tags },
  { label: "Similarity Search", to: "search", icon: Search },
  { label: "Train Model", to: "train", icon: Cpu },
  { label: "Predict", to: "predict", icon: Sparkles },
  { label: "Export", to: "export", icon: Archive },
  { label: "Settings", to: "settings", icon: Settings },
];

export default function DashboardLayout() {
  const { shapeIds, embeddingsReady, preferences } = usePipeline();
  const containerWidth = preferences.compactMode ? "max-w-6xl" : "max-w-5xl";
  const paddingClass = preferences.compactMode ? "px-4 py-6 sm:px-6" : "px-4 py-8 sm:px-8";
  const shellGradient =
    preferences.theme === "sandstone"
      ? "bg-gradient-to-br from-orange-950 via-amber-900 to-stone-900"
      : "bg-gradient-to-br from-night-900 via-night-800 to-slate-900";
  const motionProps = preferences.motionEnabled
    ? { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: "easeOut" } }
    : { initial: false };

  return (
    <div className={`min-h-screen ${shellGradient} text-slate-100`}>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-shrink-0 border-r border-white/5 bg-slate-950/40 p-6 lg:flex lg:flex-col">
          <div className="mb-10">
            <p className="pill mb-3 text-teal-200/80">Workflow</p>
            <h2 className="text-2xl font-semibold">Rock Art Toolkit</h2>
            <p className="mt-2 text-sm text-slate-400">
              Follow the pipeline from raw upload to similarity insights.
            </p>
          </div>
          <nav className="space-y-2">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={label}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? "bg-white/10 text-teal-200 shadow-brand"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/5 bg-white/5 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Pipeline Status</p>
            <div className="mt-3 space-y-2">
              <StatusRow label="Shapes" value={shapeIds.length ? `${shapeIds.length} IDs` : "Pending upload"} />
              <StatusRow
                label="Embeddings"
                value={embeddingsReady ? "Ready" : "Needs refresh"}
                accent={embeddingsReady ? "text-teal-300" : "text-amber-300"}
              />
            </div>
          </div>
        </aside>
        <div className="flex flex-1 flex-col">
          <header className="space-y-4 border-b border-white/5 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Rock Art Toolkit</p>
                <h1 className="text-2xl font-semibold">Analysis Dashboard</h1>
              </div>
              <Link
                to="/"
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-white/40 hover:text-white"
              >
                Back to landing
              </Link>
            </div>
            <nav className="flex gap-2 lg:hidden">
              {NAV_ITEMS.map(({ label, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    `flex-1 rounded-2xl border px-3 py-2 text-center text-xs font-semibold transition ${
                      isActive ? "border-teal-300 bg-teal-300/10 text-teal-200" : "border-white/10 text-slate-300"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className={`flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-black/40 ${paddingClass}`}>
            <motion.div className={`mx-auto w-full ${containerWidth}`} {...motionProps}>
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between text-slate-400">
      <span>{label}</span>
      <span className={`font-semibold text-white ${accent ?? ""}`}>{value}</span>
    </div>
  );
}
