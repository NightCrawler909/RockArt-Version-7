import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, FileSpreadsheet } from "lucide-react";
import { usePipeline } from "../../context/PipelineContext.jsx";

export default function ExportPage() {
  const { shapeIds, shapeRegistry, searchResults, predictHistory, recordExportEntry } = usePipeline();
  const [dataset, setDataset] = useState("shapes");
  const [format, setFormat] = useState("json");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const datasetMap = useMemo(() => ({
    shapes: shapeIds.map((id) => ({
      id,
      segmentationStatus: shapeRegistry[id]?.segmentationStatus ?? "pending",
      embeddingStatus: shapeRegistry[id]?.embeddingStatus ?? "pending",
      label: shapeRegistry[id]?.label ?? "unlabeled",
    })),
    labels: shapeIds.map((id) => ({ id, label: shapeRegistry[id]?.label ?? "unlabeled" })),
    search: searchResults,
    predictions: predictHistory,
  }), [shapeIds, shapeRegistry, searchResults, predictHistory]);

  const handleExport = async () => {
    const rows = datasetMap[dataset];
    if (!rows || !rows.length) {
      setError("Selected dataset is empty");
      return;
    }
    setExporting(true);
    setStatus(null);
    setError(null);
    try {
      let content = "";
      if (format === "json") {
        content = JSON.stringify(rows, null, 2);
      } else {
        content = toCsv(rows);
      }
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `rockart-${dataset}-${Date.now()}.${format}`;
      anchor.click();
      setStatus(`Exported ${rows.length} records`);
      recordExportEntry({ dataset, format, description: `${rows.length} rows` });
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message ?? "Unable to export dataset");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="pill">Stage 8 · Export</p>
        <h2 className="text-3xl font-semibold text-white">Package processed data</h2>
        <p className="text-slate-300">Download segmented shapes, label maps, similarity search responses, or prediction history in JSON/CSV format for offline analysis.</p>
      </header>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-surface space-y-5">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="text-slate-200" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Dataset</p>
            <h3 className="text-lg font-semibold text-white">Select content to export</h3>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Selector label="Shapes" value="shapes" active={dataset === "shapes"} onSelect={setDataset} description="Includes segmentation + embedding status" />
          <Selector label="Labels" value="labels" active={dataset === "labels"} onSelect={setDataset} description="Shape IDs mapped to labels" />
          <Selector label="Search results" value="search" active={dataset === "search"} onSelect={setDataset} description="Latest similarity matches" />
          <Selector label="Predictions" value="predictions" active={dataset === "predictions"} onSelect={setDataset} description="Recent inference history" />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-300">
          <button
            type="button"
            className={`rounded-full border px-4 py-2 ${format === "json" ? "border-teal-300 bg-teal-300/10" : "border-white/10"}`}
            onClick={() => setFormat("json")}
          >
            JSON
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2 ${format === "csv" ? "border-teal-300 bg-teal-300/10" : "border-white/10"}`}
            onClick={() => setFormat("csv")}
          >
            CSV
          </button>
        </div>
        <button type="button" className="glow-button" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <span className="flex items-center gap-2">
              <LoaderIcon />
              Preparing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download size={16} />
              Download dataset
            </span>
          )}
        </button>
        {status && <p className="text-sm text-teal-200">{status}</p>}
        {error && <p className="text-sm text-rose-300">{error}</p>}
      </motion.div>
    </div>
  );
}

function Selector({ label, description, active, onSelect, value }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-2xl border px-4 py-3 text-left transition ${active ? "border-teal-300 bg-teal-300/10" : "border-white/10 hover:border-white/30"}`}
    >
      <p className="font-semibold text-white">{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
    </button>
  );
}

function toCsv(rows) {
  const headers = Object.keys(rows[0] ?? {});
  const csvRows = [headers.join(",")];
  rows.forEach((row) => {
    const values = headers.map((key) => JSON.stringify(row[key] ?? ""));
    csvRows.push(values.join(","));
  });
  return csvRows.join("\n");
}

function LoaderIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-teal-200" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeLinecap="round" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
