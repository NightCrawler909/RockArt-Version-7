import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Loader2, Timer } from "lucide-react";
import { api } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function TrainModelPage() {
  const { trainingRuns, recordTrainingRun, addActivity } = usePipeline();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const latestRun = trainingRuns[0];

  const handleTrain = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await api.trainClassifier();
      recordTrainingRun(response);
      addActivity({
        type: "train",
        title: "Model training complete",
        description: `${response?.classes?.length ?? 0} classes updated`,
      });
      setMessage(`Model ${response?.model_id ?? "updated"} trained successfully`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 6 · Train Model</p>
        <h2 className="text-3xl font-semibold text-white">Refresh the classifier</h2>
        <p className="text-slate-300">Pull labeled embeddings from SQLite and run the lightweight classifier training routine with a single click.</p>
      </header>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-5">
        <div className="flex items-center gap-3">
          <Brain className="text-indigo-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Training control</p>
            <h3 className="text-xl font-semibold text-white">Kick off a training run</h3>
          </div>
        </div>
        <p className="text-sm text-slate-300">Ensure your labels are up to date, then fire off a training run to persist the classifier weights and label map.</p>
        <button type="button" className="glow-button w-full sm:w-auto" onClick={handleTrain} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Training…
            </span>
          ) : (
            "Start training"
          )}
        </button>
        {message && <p className="text-sm text-teal-200">{message}</p>}
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Latest model</p>
              <h3 className="text-lg font-semibold text-white">{latestRun ? latestRun.model_id ?? "rock-art-classifier" : "Pending"}</h3>
            </div>
            <span className="text-xs text-slate-500">{latestRun ? new Date(latestRun.timestamp).toLocaleString() : "—"}</span>
          </div>
          {latestRun ? (
            <dl className="mt-6 grid gap-4 text-sm text-slate-300">
              <div>
                <dt className="text-slate-500">Classes</dt>
                <dd className="text-white">{latestRun.classes?.length ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Accuracy</dt>
                <dd className="text-white">{formatAccuracy(latestRun.history?.accuracy)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Val accuracy</dt>
                <dd className="text-white">{formatAccuracy(latestRun.history?.val_accuracy)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-6 text-sm text-slate-400">No training runs have been logged yet. Batch label shapes and start a run.</p>
          )}
        </div>
        <TrainingHistory entries={trainingRuns} />
      </motion.div>
    </div>
  );
}

function TrainingHistory({ entries }) {
  return (
    <div className="card-surface">
      <div className="flex items-center gap-3">
        <Timer className="text-slate-300" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Training history</p>
          <p className="text-sm text-slate-300">Most recent jobs</p>
        </div>
      </div>
      {entries.length ? (
        <ul className="mt-6 space-y-3 text-sm text-slate-300">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{entry.model_id ?? "rock-art-classifier"}</span>
                <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-400">{entry.classes?.length ?? 0} classes · {formatAccuracy(entry.history?.val_accuracy)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-slate-400">Training history will appear here.</p>
      )}
    </div>
  );
}

function formatAccuracy(historyArray) {
  if (!historyArray || !historyArray.length) {
    return "n/a";
  }
  const value = historyArray[historyArray.length - 1];
  return typeof value === "number" ? value.toFixed(2) : "n/a";
}
