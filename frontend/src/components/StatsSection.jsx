import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

const stats = [
  { label: "Images processed", value: 15842, suffix: "+" },
  { label: "Shapes detected", value: 492310, suffix: "" },
  { label: "Similarity matches", value: 3189, suffix: "" },
];

function AnimatedCounter({ value, suffix }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 20, stiffness: 80 });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(Math.round(latest));
    });
    return () => unsubscribe();
  }, [springValue]);

  return (
    <span ref={ref} className="text-4xl font-semibold text-white">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  return (
    <section id="stats" className="bg-night-800 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <p className="pill mx-auto">Impact</p>
          <h2 className="mt-6 text-3xl font-semibold text-white">Operational proof in numbers</h2>
          <p className="mt-4 text-base text-slate-300">
            These snapshots come from staging data, but they mirror the throughput and focus the toolkit delivers.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {stats.map(({ label, value, suffix }, index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card-surface border-white/10 bg-slate-900/70 text-center"
            >
              <AnimatedCounter value={value} suffix={suffix} />
              <p className="mt-3 text-sm uppercase tracking-[0.35em] text-slate-400">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
