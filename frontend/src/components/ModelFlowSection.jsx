import { motion } from "framer-motion";
import {
  UploadCloud,
  Scan,
  Shapes,
  PenSquare,
  Cpu,
  Network,
  Radar,
  Sparkles,
  Layers3,
} from "lucide-react";
import FlowStep from "./model-flow/FlowStep.jsx";

const FLOW_STEPS = [
  {
    phase: "Capture",
    title: "Image Upload",
    description: "Field teams push raw captures into the toolkit where metadata, provenance, and permissions travel together.",
    details: [
      "REST upload endpoint with presigned URLs",
      "Content-type, checksum, and dimension validation",
      "Secure object storage + Postgres manifest",
    ],
    icon: UploadCloud,
    visual: {
      label: "Ingress",
      title: "JPEG · PNG · TIFF",
      description: "Up to 200 MB · EXIF retained",
      accent: "from-cyan-500/30 via-blue-500/20 to-purple-500/40",
    },
  },
  {
    phase: "Preparation",
    title: "Preprocessing & Segmentation",
    description: "Imagery is normalized, denoised, and segmented so motifs stand apart from weathered stone backdrops.",
    details: [
      "OpenCV pipelines for resize + tone mapping",
      "scikit-image contour & watershed operators",
      "Mask rehearsal with QA overlays",
    ],
    icon: Scan,
    visual: {
      label: "Processing",
      title: "Original → Masked",
      description: "Adaptive histograms & band-pass filters",
      accent: "from-indigo-500/30 via-fuchsia-500/20 to-rose-500/30",
    },
  },
  {
    phase: "Isolation",
    title: "Shape Extraction",
    description: "Every segmented motif becomes its own record with bounding boxes, masks, and contextual metadata.",
    details: [
      "Polygon + bounding box persistence",
      "Artifact ↔ scene relationship graph",
      "Versioned storage for iterative labeling",
    ],
    icon: Shapes,
    visual: {
      label: "Artifacts",
      title: "Contours stored",
      description: "GeoJSON + PNG cutouts",
      accent: "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
    },
  },
  {
    phase: "Representation",
    title: "Feature Embedding Generation",
    description: "Each shape is converted into a dense vector so patterns survive lighting and scale shifts.",
    details: [
      "TensorFlow / Keras CNN with squeeze-excite blocks",
      "512-dim float32 embedding space",
      "Batch inference orchestrated via FastAPI workers",
    ],
    icon: PenSquare,
    visual: {
      label: "Latent space",
      title: "512 dimensions",
      description: "Contrastive training across motifs",
      accent: "from-purple-500/40 via-violet-500/30 to-blue-500/30",
    },
  },
  {
    phase: "Indexing",
    title: "Vector Indexing",
    description: "Embeddings land in FAISS for millisecond retrieval, with shards ready for millions of motifs.",
    details: [
      "FAISS IVF + PQ configuration",
      "Cosine similarity with fallback L2",
      "Snapshots replicated to cold storage",
    ],
    icon: Cpu,
    visual: {
      label: "Acceleration",
      title: "FAISS shards",
      description: "HNSW build option for CPU-only nodes",
      accent: "from-cyan-400/30 via-sky-500/20 to-blue-600/30",
    },
  },
  {
    phase: "Retrieval",
    title: "Similarity Search",
    description: "Operators query with any shape, triggering nearest-neighbor lookups and ranked candidate lists.",
    details: [
      "Top-K adaptive to researcher profile",
      "Partial motif tolerance via distance thresholds",
      "Temporal audit log for every query",
    ],
    icon: Network,
    visual: {
      label: "Discovery",
      title: "Radial response",
      description: "Confidence ribbons + match counts",
      accent: "from-blue-500/30 via-cyan-400/20 to-emerald-400/30",
    },
  },
  {
    phase: "Insight",
    title: "Results & Analysis",
    description: "Similarity matrices feed the dashboard where scores, annotations, and export hooks live.",
    details: [
      "Ranked cards with explainability snippets",
      "Notebook + CSV export endpoints",
      "Feedback loop improves classifier",
    ],
    icon: Radar,
    visual: {
      label: "Output",
      title: "Analyst-ready",
      description: "Scores, notes, approvals",
      accent: "from-fuchsia-500/30 via-rose-500/20 to-orange-400/30",
    },
  },
];

const MODEL_DETAILS = [
  {
    title: "Architecture",
    summary: "Hybrid CNN backbone with residual attention heads keeps features invariant to lighting + erosion.",
    code: "Model(latent=512, backbone='ResNet50', attention='squeeze-excite')",
  },
  {
    title: "Embeddings",
    summary: "Contrastive training pairs motifs across sites so cosine distance mirrors archaeological intuition.",
    code: "contrastive_loss(anchor, positive, margin=0.2)",
  },
  {
    title: "Vector Search",
    summary: "FAISS IVF-PQ shards keep recall high while scaling horizontally across commodity instances.",
    code: "faiss.index_factory(d, 'IVF4096,PQ64', faiss.METRIC_INNER_PRODUCT)",
  },
  {
    title: "Observability",
    summary: "Structured logs and Prometheus probes wrap every stage for reproducible, reviewable science.",
    code: "emit_trace(stage='segmentation', upload_id=upload.id)",
  },
];

const PERFORMANCE_POINTS = [
  "Modular micro-stages allow independent scaling—heavy segmentation nodes never block search.",
  "Embeddings persist separately so re-indexing happens without replaying uploads.",
  "FAISS snapshots + cold storage mean demo rigs can preload millions of vectors in minutes.",
  "All steps stream metadata into the dashboard, so analysts see exactly where time is spent.",
];

export default function ModelFlowSection() {
  return (
    <div id="model-flow" className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-10 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-5xl px-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.7 }}>
          <p className="pill text-xs uppercase tracking-[0.35em] text-teal-200/80">Deep dive</p>
          <h2 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
            How the Rock Art Analysis Model Works
          </h2>
          <p className="mt-6 text-lg text-slate-300">
            Follow the neon-lit journey from raw capture to similarity insight. Each stage pairs modern ML techniques
            with field-ready guardrails, so archaeologists can trust every recommendation.
          </p>
        </motion.div>
      </div>
      <section className="relative mx-auto max-w-5xl px-6 pb-32">
        <div className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 shadow-[0_0_60px_rgba(59,130,246,0.45)] lg:block" />
        <div className="space-y-16">
          {FLOW_STEPS.map((step, index) => (
            <FlowStep key={step.title} step={step} index={index} />
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
          <div className="text-center">
            <p className="pill mx-auto">Model details</p>
            <h2 className="mt-6 text-3xl font-semibold">Why this architecture?</h2>
            <p className="mt-3 text-base text-slate-300">
              Every component is tuned for high recall, fast iteration, and transparent research handoffs.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {MODEL_DETAILS.map((detail) => (
              <article key={detail.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.6)]">
                <div className="flex items-center gap-3 text-teal-200">
                  <Sparkles size={18} />
                  <h3 className="text-xl font-semibold text-white">{detail.title}</h3>
                </div>
                <p className="mt-4 text-sm text-slate-300">{detail.summary}</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/50 p-4 text-xs text-cyan-200">
                  {detail.code}
                </pre>
              </article>
            ))}
          </div>
        </motion.div>
      </section>
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-blue-900/60 via-slate-900/80 to-cyan-900/40 p-8 shadow-[0_30px_80px_rgba(3,7,18,0.8)]">
            <div className="flex flex-wrap items-center gap-4 text-white">
              <Layers3 className="text-cyan-300" />
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Performance & Philosophy</p>
                <h3 className="mt-2 text-2xl font-semibold">Designed for demanding expeditions</h3>
              </div>
            </div>
            <ul className="mt-6 space-y-4 text-sm text-slate-100">
              {PERFORMANCE_POINTS.map((point) => (
                <li key={point} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
