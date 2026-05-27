import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Camera, CheckCircle2, CloudUpload, Loader2, Sparkles } from "lucide-react";
import { api } from "../../api/api.js";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function UploadPage() {
  const fileInputRef = useRef(null);
  const {
    registerShapes,
    setSelectedShapeId,
    setEmbeddingsReady,
    uploadSummary,
    setUploadSummary,
    shapeIds,
    shapeRegistry,
    addActivity,
  } = usePipeline();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Waiting for imagery");
  const [error, setError] = useState(null);

  const metrics = useMemo(() => {
    const segmented = shapeIds.filter((id) => shapeRegistry[id]?.segmentationStatus === "complete").length;
    const embedded = shapeIds.filter((id) => shapeRegistry[id]?.embeddingStatus === "ready").length;
    const labeled = shapeIds.filter((id) => {
      const label = shapeRegistry[id]?.label ?? "unlabeled";
      return label !== "unlabeled" && Boolean(label);
    }).length;
    return {
      total: shapeIds.length,
      segmented,
      embedded,
      labeled,
    };
  }, [shapeIds, shapeRegistry]);

  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) {
      setError("Select at least one image to start the pipeline");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(15);
    setStatus(`Uploading ${fileList.length} file(s)`);

    try {
      const uploadPromises = Array.from(fileList).map(file => api.uploadFile(file));
      const responses = await Promise.all(uploadPromises);

      let allIncomingIds = [];
      let totalShapesInserted = 0;
      let firstUploadId = null;

      for (const response of responses) {
        if (response.shape_ids) {
          allIncomingIds.push(...response.shape_ids);
        }
        if (response.shapes_inserted) {
          totalShapesInserted += response.shapes_inserted;
        }
        if (!firstUploadId && response.upload_id) {
          firstUploadId = response.upload_id;
        }
      }

      setProgress(70);
      setStatus("Running preprocessing + segmentation…");
      registerShapes(allIncomingIds);
      setUploadSummary({
        uploadId: firstUploadId || "batch",
        shapesInserted: totalShapesInserted,
        shapeIds: allIncomingIds,
        filename: `${fileList.length} file(s)`,
        startedAt: new Date().toISOString(),
      });
      setEmbeddingsReady(false);
      if (allIncomingIds.length) {
        setSelectedShapeId(allIncomingIds[0]);
      }
      addActivity({
        type: "upload",
        title: "Imagery ingested",
        description: `${allIncomingIds.length || "No"} shapes processed`,
      });
      setProgress(100);
      setStatus("Upload complete");
    } catch (err) {
      setError(err.message ?? "Upload failed");
      setStatus("Upload failed");
    } finally {
      setTimeout(() => setProgress(0), 800);
      setUploading(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const previewList = useMemo(() => shapeIds.slice(0, 6), [shapeIds]);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 2 · Upload & Process</p>
        <h2 className="text-3xl font-semibold text-white">Ingest new field imagery</h2>
        <p className="text-slate-300">
          Upload raw captures to trigger server-side preprocessing, segmentation, and quality checks before moving on to
          embeddings and labeling.
        </p>
      </header>
      <motion.div
        className={`card-surface border-dashed border-white/10 transition ${uploading ? "border-teal-300/40" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {uploading ? <Loader2 className="animate-spin text-teal-300" size={36} /> : <CloudUpload size={40} className="text-teal-200" />}
          <div>
            <p className="text-xl font-semibold">Drop imagery here</p>
            <p className="text-sm text-slate-400">JPEG, PNG or TIFF · Max 200MB</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="glow-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select file
            </button>
            <button
              type="button"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80"
              onClick={() => {
                setUploadSummary(null);
                setStatus("Waiting for imagery");
              }}
              disabled={!uploadSummary}
            >
              Clear summary
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            className="hidden"
          />
          <div className="mt-6 w-full space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{status}</span>
              <span>{progress ? `${progress}%` : ""}</span>
            </div>
            <div className="h-2 rounded-full bg-white/5">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-500 transition-all ${uploading ? "" : "shadow-inner"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
      </motion.div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={Camera} label="Shapes processed" value={metrics.total} accent="text-teal-200" />
        <MetricTile icon={CheckCircle2} label="Segmented" value={metrics.segmented} accent="text-cyan-200" />
        <MetricTile icon={Sparkles} label="Embeddings ready" value={metrics.embedded} accent="text-blue-200" />
        <MetricTile icon={Activity} label="Labeled" value={metrics.labeled} accent="text-amber-200" />
      </section>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Processing status</p>
            <h3 className="text-xl font-semibold text-white">{uploadSummary ? "Latest batch" : "Awaiting upload"}</h3>
          </div>
          {uploading && <span className="text-sm text-slate-400">Streaming to server…</span>}
        </div>
        {uploadSummary ? (
          <dl className="mt-6 grid gap-4 text-sm text-slate-300 sm:grid-cols-3">
            <div>
              <dt className="text-slate-400">Upload ID</dt>
              <dd className="text-white">{uploadSummary.uploadId}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Shapes inserted</dt>
              <dd className="text-white">{uploadSummary.shapesInserted}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Started</dt>
              <dd className="text-white">{new Date(uploadSummary.startedAt).toLocaleString()}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-6 text-sm text-slate-400">No uploads yet. Your next ingest will appear here with processing metadata.</p>
        )}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card-surface">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Segment previews</p>
            <h3 className="text-xl font-semibold text-white">Recent shapes</h3>
          </div>
          <span className="text-xs text-slate-400">{previewList.length} / {shapeIds.length} displayed</span>
        </div>
        {previewList.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previewList.map((id) => (
              <ShapePreview key={id} id={id} shape={shapeRegistry[id]} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
            Drop imagery above to populate segmented shape previews with live status badges.
          </div>
        )}
      </motion.div>
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Icon size={18} className={accent} />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function ShapePreview({ id, shape }) {
  const status = shape?.segmentationStatus === "complete" ? "Segmented" : "Queued";
  const badgeClass = shape?.segmentationStatus === "complete" ? "text-teal-200" : "text-amber-200";
  const gradientSeed = (shape?.previewSeed ?? 1) % 360;
  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-white/5 to-white/0 p-4">
      <div
        className="h-32 w-full rounded-xl"
        style={{
          background: `linear-gradient(130deg, rgba(${30 + gradientSeed % 120}, 200, 200, 0.3), rgba(15, 15, 40, 0.5))`,
        }}
      />
      <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
        <span className="font-semibold text-white">{id}</span>
        <span className={`text-xs ${badgeClass}`}>{status}</span>
      </div>
    </div>
  );
}
