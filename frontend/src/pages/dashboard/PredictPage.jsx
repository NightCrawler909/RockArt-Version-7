import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UploadCloud, Wand2 } from "lucide-react";
import { api } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function PredictPage() {
  const fileInputRef = useRef(null);
  const {
    shapeIds,
    shapeRegistry,
    registerShapes,
    setSelectedShapeId,
    recordPredictEntry,
    addActivity,
  } = usePipeline();
  const [mode, setMode] = useState("shape");
  const [shapeInput, setShapeInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const limit = 5;

  const labeledShapes = useMemo(
    () => shapeIds.filter((id) => {
      const label = shapeRegistry[id]?.label ?? "unlabeled";
      return label !== "unlabeled" && Boolean(label);
    }),
    [shapeIds, shapeRegistry]
  );

  const derivePrediction = (matches) => {
    const tally = matches.reduce((acc, match) => {
      const label = match.label !== "unlabeled" ? match.label : shapeRegistry[match.id]?.label;
      if (label && label !== "unlabeled") {
        acc[label] = (acc[label] ?? 0) + 1;
      }
      return acc;
    }, {});
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) {
      return null;
    }
    const [label, count] = sorted[0];
    return {
      label,
      confidence: count / Math.max(1, matches.length),
    };
  };

  const runInference = async (shapeId) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await api.search({ shape_id: shapeId, limit });
      const matches =
        response?.matches?.map((entry, index) => ({
          id: entry[0],
          score: Number(entry[1]),
          label: entry[2] || "unlabeled",
          rank: index + 1,
        })) ?? [];
      const prediction = derivePrediction(matches);
      if (!prediction) {
        setError("No labeled neighbors available. Label shapes first.");
        setResults({ shapeId, matches, prediction: null });
        return;
      }
      const entry = {
        shapeId,
        prediction: prediction.label,
        confidence: prediction.confidence,
        matches,
      };
      setResults(entry);
      recordPredictEntry(entry);
      addActivity({ type: "predict", title: "Inference complete", description: `${shapeId} → ${prediction.label}` });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShapeSubmit = async (event) => {
    event.preventDefault();
    if (!shapeInput.trim()) {
      setError("Provide a shape ID");
      return;
    }
    await runInference(shapeInput.trim());
  };

  const handleUpload = async (fileList) => {
    const file = fileList?.[0];
    if (!file) {
      setError("Select an image to predict");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.uploadFile(file);
      const newShapes = response.shape_ids ?? [];
      if (!newShapes.length) {
        setError("No shapes detected in the upload");
        return;
      }
      registerShapes(newShapes);
      setSelectedShapeId(newShapes[0]);
      await runInference(newShapes[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confidenceText =
    results?.prediction && typeof results?.confidence === "number"
      ? `${(results.confidence * 100).toFixed(1)}%`
      : "—";
  const predictionLabel = results?.prediction ? `${results.prediction} (${confidenceText})` : "No prediction";

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 7 · Predict</p>
        <h2 className="text-3xl font-semibold text-white">Run lightweight inference</h2>
        <p className="text-slate-300">Select an existing shape or upload fresh imagery to retrieve the most likely class based on labeled neighbors.</p>
      </header>
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <button
          type="button"
          onClick={() => setMode("shape")}
          className={`rounded-full border px-4 py-2 font-semibold transition ${mode === "shape" ? "border-teal-300 bg-teal-300/10 text-teal-200" : "border-white/10 hover:border-white/30"}`}
        >
          Use existing shape
        </button>
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`rounded-full border px-4 py-2 font-semibold transition ${mode === "upload" ? "border-teal-300 bg-teal-300/10 text-teal-200" : "border-white/10 hover:border-white/30"}`}
        >
          Upload for inference
        </button>
      </div>
      {mode === "shape" ? (
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleShapeSubmit} className="card-surface space-y-5">
          <label className="text-sm text-slate-300">Shape ID</label>
          <input
            type="text"
            value={shapeInput}
            onChange={(event) => setShapeInput(event.target.value)}
            placeholder="Choose from labeled shapes"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-teal-300 focus:outline-none"
          />
          {labeledShapes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labeledShapes.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200"
                  onClick={() => setShapeInput(id)}
                >
                  {id}
                </button>
              ))}
            </div>
          )}
          <button type="submit" className="glow-button w-full sm:w-auto" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Predicting…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Wand2 size={16} />
                Predict
              </span>
            )}
          </button>
        </motion.form>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface text-center">
          <p className="text-sm text-slate-300">Drop an image to run preprocessing, segmentation, and inference in a single step.</p>
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6">
            <UploadCloud className="mx-auto text-teal-200" size={36} />
            <p className="mt-3 text-sm text-slate-400">JPEG/PNG • 200MB max</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                className="glow-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Select file
              </button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(event) => handleUpload(event.target.files)} />
          </div>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Prediction</p>
            <h3 className="text-2xl font-semibold text-white">{predictionLabel}</h3>
          </div>
          {results?.shapeId && <span className="text-xs text-slate-500">Shape {results.shapeId}</span>}
        </div>
        {loading ? (
          <PredictionSkeleton />
        ) : results?.matches?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.matches.map((match) => (
              <div key={match.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span className="font-semibold text-white">{match.id}</span>
                  <span className="text-xs">Rank #{match.rank}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">Distance {match.score.toFixed(3)}</p>
                <p className="text-xs text-slate-400">Label {match.label !== "unlabeled" ? match.label : (shapeRegistry[match.id]?.label ?? "unknown")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Run an inference to visualize neighbor evidence.</p>
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </motion.div>
    </div>
  );
}

function PredictionSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1].map((key) => (
        <div key={key} className="h-28 rounded-2xl border border-white/5 bg-white/10 animate-pulse" />
      ))}
    </div>
  );
}
