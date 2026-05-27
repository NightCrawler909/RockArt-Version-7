import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, Loader2, Tag, X } from "lucide-react";
import { api, API_BASE } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function BatchLabelingPage() {
  const { shapeIds, shapeRegistry, assignLabel, assignLabelsBatch, addActivity } = usePipeline();
  const [draftLabels, setDraftLabels] = useState({});
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [batchLabel, setBatchLabel] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState({});
  const [previewImage, setPreviewImage] = useState(null);

  const rows = useMemo(
    () =>
      shapeIds.map((id) => ({
        id,
        label: shapeRegistry[id]?.label ?? "unlabeled",
        confidence: shapeRegistry[id]?.confidence ?? 1,
      })),
    [shapeIds, shapeRegistry]
  );

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSingleUpdate = async (shapeId) => {
    const nextLabel = draftLabels[shapeId]?.trim();
    if (!nextLabel) {
      setError("Provide a label before saving");
      return;
    }
    setError(null);
    setMessage(null);
    setRowLoading((prev) => ({ ...prev, [shapeId]: true }));
    try {
      await api.updateLabel({ shape_id: shapeId, label: nextLabel, confidence: 1 });
      assignLabel(shapeId, nextLabel, 1);
      setMessage(`Label updated for ${shapeId}`);
      addActivity({ type: "label", title: "Shape labeled", description: `${shapeId} → ${nextLabel}` });
    } catch (err) {
      setError(err.message);
    } finally {
      setRowLoading((prev) => ({ ...prev, [shapeId]: false }));
    }
  };

  const handleBatchUpdate = async () => {
    if (!selectedIds.size) {
      setError("Select at least one shape");
      return;
    }
    if (!batchLabel.trim()) {
      setError("Provide a label for the batch update");
      return;
    }
    setError(null);
    setMessage(null);
    setBatchLoading(true);
    const updates = Array.from(selectedIds).map((id) => ({ shape_id: id, label: batchLabel.trim(), confidence: 1 }));
    try {
      await api.batchUpdateLabels(updates);
      assignLabelsBatch(updates);
      addActivity({
        type: "label",
        title: "Batch labeling",
        description: `${updates.length} shapes → ${batchLabel.trim()}`,
      });
      setMessage(`Updated ${updates.length} shapes`);
      setSelectedIds(new Set());
      setBatchLabel("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 4 · Batch Labeling</p>
        <h2 className="text-3xl font-semibold text-white">Assign labels at scale</h2>
        <p className="text-slate-300">Review segmented shapes, capture semantic labels, and push batch updates to the backend with one click.</p>
      </header>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Shape catalog</p>
            <h3 className="text-xl font-semibold text-white">{rows.length ? `${rows.length} shapes` : "Awaiting uploads"}</h3>
          </div>
          <div className="flex items-center gap-4">
            {rows.length > 0 && (
              <button
                type="button"
                className="text-sm font-medium text-teal-300 hover:text-teal-200 transition"
                onClick={() => {
                  if (selectedIds.size === rows.length) {
                    setSelectedIds(new Set());
                  } else {
                    setSelectedIds(new Set(rows.map((r) => r.id)));
                  }
                }}
              >
                {selectedIds.size === rows.length ? "Deselect all" : "Select all"}
              </button>
            )}
            <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
          </div>
        </div>
        {rows.length ? (
          <div className="mt-6 space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => toggleSelection(row.id)}
                    className="h-4 w-4 rounded border-white/20 bg-transparent"
                  />
                  <img
                    src={`${API_BASE}/data/shapes/${row.id}.png`}
                    alt="Shape preview"
                    className="h-10 w-10 rounded object-cover bg-slate-200 cursor-pointer hover:opacity-80 transition"
                    onClick={() => setPreviewImage(`${API_BASE}/data/shapes/${row.id}.png`)}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="font-semibold text-white">{row.id}</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{row.label}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={draftLabels[row.id] ?? ""}
                    onChange={(event) => setDraftLabels((prev) => ({ ...prev, [row.id]: event.target.value }))}
                    placeholder="Enter new label"
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="glow-button"
                    onClick={() => handleSingleUpdate(row.id)}
                    disabled={rowLoading[row.id]}
                  >
                    {rowLoading[row.id] ? <Loader2 size={16} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-400">Upload imagery and run segmentation to populate shapes for labeling.</p>
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-5">
        <div className="flex items-center gap-3">
          <Tag className="text-slate-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Batch action</p>
            <h3 className="text-lg font-semibold text-white">Apply a label to selected shapes</h3>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={batchLabel}
            onChange={(event) => setBatchLabel(event.target.value)}
            placeholder="Enter label"
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-teal-300 focus:outline-none"
          />
          <button
            type="button"
            className="glow-button"
            onClick={handleBatchUpdate}
            disabled={batchLoading}
          >
            {batchLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Updating…
              </span>
            ) : (
              "Update selected"
            )}
          </button>
        </div>
        {message && (
          <p className="inline-flex items-center gap-2 text-sm text-teal-200">
            <BadgeCheck size={16} />
            {message}
          </p>
        )}
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </motion.div>

      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-slate-200 p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition"
                onClick={() => setPreviewImage(null)}
              >
                <X size={20} />
              </button>
              <img
                src={previewImage}
                alt="Expanded preview"
                className="max-h-[85vh] max-w-full object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
