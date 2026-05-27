import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Brain, Layers3, Sparkles, Tag, UploadCloud } from "lucide-react";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function DashboardHome() {
  const {
    shapeIds,
    shapeRegistry,
    embeddingsReady,
    trainingRuns,
    activityLog,
    predictHistory,
    exportHistory,
  } = usePipeline();

  const metrics = useMemo(() => {
    const total = shapeIds.length;
    const segmented = shapeIds.filter((id) => shapeRegistry[id]?.segmentationStatus === "complete").length;
    const embedded = shapeIds.filter((id) => shapeRegistry[id]?.embeddingStatus === "ready").length;
    const labeled = shapeIds.filter((id) => {
      const label = shapeRegistry[id]?.label ?? "unlabeled";
      return label !== "unlabeled" && Boolean(label);
    }).length;
    const pct = (count) => (total ? Math.round((count / total) * 100) : 0);
    return {
      total,
      segmented,
      embedded,
      labeled,
      segmentedPct: pct(segmented),
      embeddedPct: pct(embedded),
      labeledPct: pct(labeled),
    };
  }, [shapeIds, shapeRegistry]);

  const latestModel = trainingRuns[0];

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 1 · Dashboard</p>
        <h2 className="text-3xl font-semibold text-white">Pipeline health & analytics</h2>
        <p className="text-slate-300">Track ingestion velocity, embedding coverage, and downstream activity without leaving the dashboard.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UploadCloud} label="Total shapes" value={metrics.total} detail="Across current session" />
        <StatCard icon={Layers3} label="Segmented" value={`${metrics.segmentedPct}%`} detail={`${metrics.segmented} shapes`} />
        <StatCard icon={Sparkles} label="Embeddings" value={`${metrics.embeddedPct}%`} detail={embeddingsReady ? "Ready" : "Needs refresh"} accent={embeddingsReady ? "text-teal-200" : "text-amber-200"} />
        <StatCard icon={Tag} label="Labeled" value={`${metrics.labeledPct}%`} detail={`${metrics.labeled} annotated`} />
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Pipeline coverage</p>
              <h3 className="text-xl font-semibold text-white">Operational snapshot</h3>
            </div>
            <span className="text-xs text-slate-500">Session data</span>
          </div>
          <div className="mt-6 space-y-4">
            <ProgressRow label="Upload" value={metrics.total ? 100 : 0} />
            <ProgressRow label="Segment" value={metrics.segmentedPct} />
            <ProgressRow label="Embed" value={metrics.embeddedPct} />
            <ProgressRow label="Label" value={metrics.labeledPct} />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
          <div className="flex items-center gap-3">
            <Brain className="text-indigo-200" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Model snapshot</p>
              <h3 className="text-lg font-semibold text-white">{latestModel ? latestModel.model_id ?? "New run" : "Not trained"}</h3>
            </div>
          </div>
          {latestModel ? (
            <dl className="mt-6 grid gap-4 text-sm text-slate-300">
              <div>
                <dt className="text-slate-500">Classes</dt>
                <dd className="text-white">{latestModel.classes?.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Timestamp</dt>
                <dd className="text-white">{new Date(latestModel.timestamp).toLocaleString()}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-6 text-sm text-slate-400">Run the training workflow to populate classifier metadata.</p>
          )}
        </motion.div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed entries={activityLog.slice(0, 6)} />
        <div className="space-y-6">
          <PredictionList entries={predictHistory.slice(0, 3)} />
          <ExportList entries={exportHistory.slice(0, 3)} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Icon size={18} className={accent} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function ProgressRow({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ActivityFeed({ entries }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
      <div className="flex items-center gap-3">
        <Activity className="text-slate-300" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Activity log</p>
          <p className="text-sm text-slate-300">Latest events across the toolkit</p>
        </div>
      </div>
      {entries.length ? (
        <ul className="mt-6 space-y-3 text-sm text-slate-300">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{entry.title}</span>
                <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-400">{entry.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-slate-400">Run uploads, segmentation, or labeling actions to populate the activity stream.</p>
      )}
    </motion.div>
  );
}

function PredictionList({ entries }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Predictions</p>
          <h3 className="text-lg font-semibold text-white">Recent inferences</h3>
        </div>
        <span className="text-xs text-slate-500">{entries.length} records</span>
      </div>
      {entries.length ? (
        <ul className="mt-5 space-y-3 text-sm text-slate-300">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{entry.prediction ?? "Unknown"}</span>
                <span className="text-xs text-slate-500">
                  {typeof entry.confidence === "number" ? `${(entry.confidence * 100).toFixed(1)}%` : "—"}
                </span>
              </div>
              <p className="text-xs text-slate-400">Shape {entry.shapeId ?? entry.input}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-400">No predictions yet.</p>
      )}
    </motion.div>
  );
}

function ExportList({ entries }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Exports</p>
          <h3 className="text-lg font-semibold text-white">Recent downloads</h3>
        </div>
        <span className="text-xs text-slate-500">{entries.length} records</span>
      </div>
      {entries.length ? (
        <ul className="mt-5 space-y-3 text-sm text-slate-300">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{entry.format?.toUpperCase?.() ?? entry.format}</span>
                <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-400">{entry.description ?? entry.dataset ?? "Dataset export"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-400">No exports generated yet.</p>
      )}
    </motion.div>
  );
}
