import { motion } from "framer-motion";
import { UploadCloud, Cog, Share2, Search, BarChart3 } from "lucide-react";

const steps = [
  {
    label: "Upload",
    description: "Drop raw captures or drag from collectors. Metadata stays attached for context.",
    icon: UploadCloud,
  },
  {
    label: "Process",
    description: "Automated cleaning, segmentation, and QA taps into the FastAPI services.",
    icon: Cog,
  },
  {
    label: "Embed",
    description: "Specialized encoders generate dense vectors optimized for glyph discovery.",
    icon: Share2,
  },
  {
    label: "Search",
    description: "Vectors feed the similarity explorer so motifs surface instantly.",
    icon: Search,
  },
  {
    label: "Analyze",
    description: "Context cards capture field notes, hypotheses, and links to site archives.",
    icon: BarChart3,
  },
];

export default function WorkflowSection() {
  return (
    <section id="workflow" className="bg-gradient-to-b from-night-900 to-night-800 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 text-white lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="pill">Workflow</p>
            <h2 className="mt-6 text-3xl font-semibold">Rock-solid orchestration in five phases</h2>
            <p className="mt-4 max-w-2xl text-base text-slate-300">
              Every step is auditable. Hover to preview details, or click into the dashboard when you are ready to act.
            </p>
          </div>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-5">
          {steps.map(({ label, description, icon: Icon }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative rounded-3xl border border-white/10 bg-slate-900/60 p-5 text-slate-200 shadow-brand"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3 text-teal-200">
                  <Icon size={22} />
                </div>
                <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-white">{label}</h3>
              <p className="mt-2 text-sm text-slate-300">{description}</p>
              {index < steps.length - 1 && (
                <span className="absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent md:block" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
