import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, SlidersHorizontal } from "lucide-react";
import { API_BASE } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function SettingsPage() {
  const { preferences, updatePreferences } = usePipeline();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(API_BASE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.error("Unable to copy API base", error);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 9 · Settings</p>
        <h2 className="text-3xl font-semibold text-white">Personalize the dashboard</h2>
        <p className="text-slate-300">Adjust layout density, animation preferences, and review the connected API endpoint.</p>
      </header>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-6">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="text-slate-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Interface</p>
            <h3 className="text-lg font-semibold text-white">Display preferences</h3>
          </div>
        </div>
        <Toggle
          label="Compact layout"
          description="Reduce padding and tighten cards for dense monitoring."
          value={preferences.compactMode}
          onChange={(state) => updatePreferences({ compactMode: state })}
        />
        <Toggle
          label="Motion effects"
          description="Enable micro animations for transitions."
          value={preferences.motionEnabled}
          onChange={(state) => updatePreferences({ motionEnabled: state })}
        />
        <div>
          <p className="text-sm font-semibold text-white">Theme palette</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updatePreferences({ theme: option.value })}
                className={`rounded-2xl border px-4 py-2 text-sm transition ${
                  preferences.theme === option.value ? "border-teal-300 bg-teal-300/10" : "border-white/10 hover:border-white/30"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Backend</p>
        <h3 className="mt-2 text-lg font-semibold text-white">API base URL</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <code className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-teal-100">{API_BASE}</code>
          <button type="button" className="glow-button flex items-center gap-2" onClick={handleCopy}>
            <Copy size={16} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const THEME_OPTIONS = [
  { label: "Midnight", value: "midnight" },
  { label: "Sandstone", value: "sandstone" },
];

function Toggle({ label, description, value, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full border border-white/20 transition ${value ? "bg-teal-400/40" : "bg-white/5"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </label>
  );
}
