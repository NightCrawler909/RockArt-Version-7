import { motion } from "framer-motion";
import { Image, Target, LineChart, Server } from "lucide-react";

const features = [
  {
    title: "Image Upload & Segmentation",
    description: "Streamlined uploads with instant segmentation overlays keep the field team confident.",
    icon: Image,
  },
  {
    title: "ML-based Embedding & Similarity",
    description: "High-dimensional embeddings expose subtle motifs and related glyphs in seconds.",
    icon: Target,
  },
  {
    title: "Archaeological Pattern Analysis",
    description: "Cross-site trends, anomaly flags, and contextual notes remain linked to each artifact.",
    icon: LineChart,
  },
  {
    title: "Fast & Scalable Backend",
    description: "FastAPI orchestrates GPU workloads with queues, retries, and observability built in.",
    icon: Server,
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-night-900 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="pill mx-auto">Feature Deep Dive</p>
          <h2 className="mt-6 text-3xl font-semibold text-white sm:text-4xl">A landing crafted for ML operators</h2>
          <p className="mt-4 text-base text-slate-300">
            Each card represents a dedicated dashboard module that keeps the toolkit transparent.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {features.map(({ title, description, icon: Icon }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-surface border-white/10 bg-slate-900/60"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-white/10 p-3 text-teal-300">
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-semibold text-white">{title}</h3>
              </div>
              <p className="mt-4 text-sm text-slate-300">{description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
