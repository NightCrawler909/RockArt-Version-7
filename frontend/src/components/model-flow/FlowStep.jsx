import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function FlowStep({ step, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, amount: 0.4 });
  const alignLeft = index % 2 === 0;

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0.4, y: 20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`relative py-8 ${alignLeft ? "lg:pr-[55%]" : "lg:pl-[55%]"}`}
    >
      <motion.span
        className={`absolute left-1/2 top-6 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border text-xs font-semibold tracking-[0.3em] uppercase ${
          inView
            ? "border-cyan-300/70 bg-cyan-400/20 text-white shadow-[0_0_30px_rgba(6,182,212,0.85)]"
            : "border-white/15 bg-slate-900 text-slate-500"
        }`}
        animate={inView ? { scale: 1.05 } : { scale: 1 }}
      >
        {String(index + 1).padStart(2, "0")}
      </motion.span>
      <div
        className={`w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.65)] backdrop-blur transition ${
          alignLeft ? "lg:ml-auto lg:max-w-xl" : "lg:mr-auto lg:max-w-xl"
        } ${inView ? "ring-1 ring-cyan-300/30" : ""}`}
      >
        <div className="flex items-center gap-3 text-teal-200">
          {step.icon && <step.icon size={24} className="text-cyan-300" />}
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{step.phase}</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">{step.title}</h3>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">{step.description}</p>
        <div className="mt-5 rounded-2xl border border-white/5 bg-slate-900/60 p-4">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Technical focus</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {(step.details ?? []).map((detail) => (
              <li key={detail} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300">{detail}</span>
              </li>
            ))}
          </ul>
        </div>
        {step.visual && (
          <div
            className={`mt-6 rounded-2xl border border-white/10 bg-gradient-to-r ${step.visual.accent} p-4 text-sm text-white shadow-[0_0_45px_rgba(6,182,212,0.45)]`}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">{step.visual.label}</p>
            <p className="mt-1 text-lg font-semibold">{step.visual.title}</p>
            <p className="mt-1 text-white/80">{step.visual.description}</p>
          </div>
        )}
      </div>
    </motion.article>
  );
}
