import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Layers3, Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { api } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function EmbeddingsPage() {
  const {
    shapeIds,
    shapeRegistry,
    embeddingsReady,
    markEmbeddingComplete,
    segmentRuns,
    recordSegmentRun,
    embeddingRuns,
    recordEmbeddingRun,
    addActivity,
  } = usePipeline();
  const [segmentPath, setSegmentPath] = useState("");
  const [segmentMessage, setSegmentMessage] = useState(null);
  const [segmentLoading, setSegmentLoading] = useState(false);
  const [embeddingMessage, setEmbeddingMessage] = useState(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);

  const shapeRows = useMemo(
    () =>
      shapeIds.map((id) => ({
        id,
        segmentationStatus: shapeRegistry[id]?.segmentationStatus ?? "pending",
        embeddingStatus: shapeRegistry[id]?.embeddingStatus ?? "pending",
        label: shapeRegistry[id]?.label ?? "unlabeled",
      })),
    [shapeIds, shapeRegistry]
  );

  const handleReprocess = async () => {
    if (!segmentPath.trim()) {
      setSegmentMessage("Provide a server-side image path to reprocess");
      return;
    }
    setSegmentLoading(true);
    setSegmentMessage(null);
    try {
      const response = await api.reprocessImage(segmentPath.trim());
      setSegmentMessage(`Segmented ${response?.segments ?? 0} shapes (${response?.inserted ?? 0} stored)`);
      recordSegmentRun({ target: segmentPath.trim(), ...response });
      addActivity({
        type: "segment",
        title: "Segmentation refreshed",
        description: `${response?.segments ?? 0} shapes reprocessed`,
      });
    } catch (error) {
      setSegmentMessage(error.message);
    } finally {
      setSegmentLoading(false);
    }
  };

  const handleGenerateEmbeddings = async () => {
    if (!shapeIds.length) {
      setEmbeddingMessage("Upload or select shapes first");
      return;
    }
    setEmbeddingLoading(true);
    setEmbeddingMessage(null);
    try {
      await api.generateEmbeddings();
      markEmbeddingComplete(shapeIds);
      recordEmbeddingRun({ total: shapeIds.length });
      addActivity({
        type: "embed",
        title: "FAISS index refreshed",
        description: `${shapeIds.length} shapes embedded`,
      });
      setEmbeddingMessage("FAISS index rebuilt from latest embeddings");
    } catch (error) {
      setEmbeddingMessage(error.message);
    } finally {
      setEmbeddingLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 3 · Segment & Embed</p>
        <h2 className="text-3xl font-semibold text-white">Control segmentation and embedding runs</h2>
        <p className="text-slate-300">Re-run segmentation on archived captures and rebuild embeddings before moving into search, labeling, or training.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div whileHover={{ translateY: -3 }} className="card-surface space-y-4">
          <div className="flex items-center gap-3">
            <RefreshCcw className="text-amber-200" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Segmentation</p>
              <h3 className="text-xl font-semibold text-white">Reprocess existing imagery</h3>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Provide the server-side path to an already uploaded capture to regenerate polygonal segments and repopulate the shapes table.
          </p>
          <input
            type="text"
            value={segmentPath}
            onChange={(event) => setSegmentPath(event.target.value)}
            placeholder="/data/raw/field_012.png"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-teal-300 focus:outline-none"
          />
          <button
            type="button"
            className="glow-button"
            onClick={handleReprocess}
            disabled={segmentLoading}
          >
            {segmentLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Reprocessing…
              </span>
            ) : (
              "Reprocess imagery"
            )}
          </button>
          {segmentMessage && <p className="text-sm text-slate-300">{segmentMessage}</p>}
        </motion.div>
        <motion.div whileHover={{ translateY: -3 }} className="card-surface space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-teal-200" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Embeddings</p>
              <h3 className="text-xl font-semibold text-white">Regenerate FAISS index</h3>
            </div>
          </div>
          <p className="text-sm text-slate-300">
            Refresh the vector index after segmentation or labeling changes to ensure similarity search reflects the latest embeddings.
          </p>
          <button
            type="button"
            className="glow-button"
            onClick={handleGenerateEmbeddings}
            disabled={embeddingLoading || !shapeIds.length}
          >
            {embeddingLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Generating…
              </span>
            ) : (
              "Generate embeddings"
            )}
          </button>
          <StatusBadge ready={embeddingsReady} label={embeddingsReady ? "Embeddings ready" : "Needs refresh"} />
          {embeddingMessage && <p className="text-sm text-slate-300">{embeddingMessage}</p>}
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Shape readiness</p>
            <h3 className="text-xl font-semibold text-white">{shapeIds.length ? "Tracked shapes" : "Awaiting uploads"}</h3>
          </div>
          <span className="text-xs text-slate-400">{shapeIds.length} total</span>
        </div>
        {shapeRows.length ? (
          <div className="mt-6 grid gap-3">
            {shapeRows.map((shape) => (
              <ShapeStatus key={shape.id} shape={shape} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-400">Upload imagery first to visualize segmentation and embedding readiness per shape.</p>
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-2">
        <RunLog title="Segmentation runs" icon={RefreshCcw} entries={segmentRuns} emptyText="Run a reprocess job to populate history." />
        <RunLog title="Embedding refresh" icon={Layers3} entries={embeddingRuns} emptyText="Refresh the FAISS index to log runs." />
      </motion.div>
    </div>
  );
}

function StatusBadge({ label, ready }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
      <span className={`h-2 w-2 rounded-full ${ready ? "bg-teal-300" : "bg-amber-300"}`} />
      <span className={ready ? "text-teal-200" : "text-amber-200"}>{label}</span>
    </div>
  );
}

function ShapeStatus({ shape }) {
  const embedReady = shape.embeddingStatus === "ready";
  const segReady = shape.segmentationStatus === "complete";
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between text-sm text-white">
        <span className="font-semibold">{shape.id}</span>
        <span className="text-xs text-slate-400">{shape.label}</span>
      </div>
      <div className="mt-3 flex gap-3 text-xs">
        <span className={`rounded-full px-3 py-1 ${segReady ? "bg-teal-300/20 text-teal-200" : "bg-amber-300/20 text-amber-200"}`}>
          {segReady ? "Segmented" : "Pending"}
        </span>
        <span className={`rounded-full px-3 py-1 ${embedReady ? "bg-blue-300/20 text-blue-100" : "bg-slate-600/40 text-slate-200"}`}>
          {embedReady ? "Embedded" : "Awaiting"}
        </span>
      </div>
    </div>
  );
}

function RunLog({ title, icon: Icon, entries, emptyText }) {
  return (
    <div className="card-surface">
      <div className="flex items-center gap-3">
        <Icon className="text-slate-300" size={18} />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{title}</p>
          <p className="text-sm text-slate-300">{entries.length ? `${entries.length} recent` : "No runs"}</p>
        </div>
      </div>
      {entries.length ? (
        <ul className="mt-6 space-y-3 text-sm text-slate-300">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{entry.target ?? `${entry.total ?? entry.segments ?? 0} shapes`}</span>
                <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-400">
                {entry.segments !== undefined ? `${entry.segments} segments · ${entry.inserted ?? 0} inserted` : `${entry.total ?? 0} embeddings refreshed`}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-slate-400">{emptyText}</p>
      )}
    </div>
  );
}
