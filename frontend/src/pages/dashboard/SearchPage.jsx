import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Layers3, Loader2, Search, Target } from "lucide-react";
import { api } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function SearchPage() {
  const {
    shapeIds,
    selectedShapeId,
    setSelectedShapeId,
    embeddingsReady,
    searchResults,
    setSearchResults,
    lastSearchMeta,
    setLastSearchMeta,
    addActivity,
  } = usePipeline();
  const [shapeIdInput, setShapeIdInput] = useState(selectedShapeId ?? "");
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    setShapeIdInput(selectedShapeId ?? "");
  }, [selectedShapeId]);

  const highlightResults = useMemo(() => searchResults.slice(0, 6), [searchResults]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!embeddingsReady) {
      setError("Generate embeddings before searching");
      return;
    }
    if (!shapeIdInput) {
      setError("Provide a shape ID to search against");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await api.search({ shape_id: shapeIdInput.trim(), limit });
      const matches =
        response?.matches?.map((entry, index) => ({
          id: entry[0],
          score: Number(entry[1]),
          rank: index + 1,
        })) ?? [];
      setSearchResults(matches);
      const meta = {
        timestamp: new Date().toISOString(),
        requestedShape: response?.shape_id ?? shapeIdInput,
        total: matches.length,
      };
      setLastSearchMeta(meta);
      setSelectedShapeId(response?.shape_id ?? shapeIdInput);
      setSuccessMessage(`Found ${matches.length} similar shapes`);
      addActivity({
        type: "search",
        title: "Similarity search",
        description: `${matches.length} matches for ${meta.requestedShape}`,
      });
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 5 · Similarity Search</p>
        <h2 className="text-3xl font-semibold text-white">Query the embedding space</h2>
        <p className="text-slate-300">Provide a reference shape ID to retrieve the closest matches from the FAISS index with ranked distance scores.</p>
      </header>
      <motion.form
        onSubmit={handleSubmit}
        className="card-surface space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <label className="text-sm text-slate-300">Shape ID</label>
          <input
            type="text"
            value={shapeIdInput}
            onChange={(event) => setShapeIdInput(event.target.value)}
            placeholder="Select from recent uploads or paste an existing ID"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-teal-300 focus:outline-none"
          />
        </div>
        {shapeIds.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recent shape IDs</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {shapeIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setShapeIdInput(id);
                    setSelectedShapeId(id);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    id === selectedShapeId
                      ? "border-teal-300 bg-teal-300/10 text-teal-200"
                      : "border-white/10 text-slate-300 hover:border-white/30"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-slate-300">Top-K</label>
            <input
              type="range"
              min={3}
              max={20}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="mt-3 w-full accent-teal-300"
            />
            <p className="mt-1 text-xs text-slate-400">Returning {limit} matches</p>
          </div>
          <div className="flex items-end">
            <button type="submit" className="glow-button w-full justify-center" disabled={loading || !embeddingsReady}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Searching…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  Run similarity search
                </span>
              )}
            </button>
          </div>
        </div>
        {!embeddingsReady && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle size={16} />
            Generate embeddings before running a search.
          </div>
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {successMessage && <p className="text-sm text-teal-200">{successMessage}</p>}
      </motion.form>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Latest results</p>
            <h3 className="text-xl font-semibold text-white">{lastSearchMeta?.requestedShape ?? "No query yet"}</h3>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Matches: {lastSearchMeta?.total ?? searchResults.length}</p>
            <p>{lastSearchMeta ? new Date(lastSearchMeta.timestamp).toLocaleTimeString() : "—"}</p>
          </div>
        </div>
        {loading ? (
          <ResultsSkeleton />
        ) : highlightResults.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {highlightResults.map((result) => (
              <motion.div key={result.id} whileHover={{ translateY: -4 }} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Rank #{result.rank}</p>
                    <p className="text-lg font-semibold text-white">{result.id}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs">
                    <Layers3 size={14} /> Candidate
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Metric label="Distance" value={result.score.toFixed(3)} icon={Target} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Confidence</p>
                    <div className="mt-2 h-2 rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-500"
                        style={{ width: `${Math.max(5, 100 - result.score * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">
            Results will appear here after your next similarity search. Each card highlights rank, distance, and confidence.
          </div>
        )}
      </motion.section>
    </div>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-300">
      <Icon size={14} />
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[0, 1].map((item) => (
        <div key={item} className="h-36 rounded-2xl border border-white/5 bg-white/10 animate-pulse" />
      ))}
    </div>
  );
}
