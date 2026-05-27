import { Github } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-night-900/90 py-10 text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-widest text-white/80">Rock Art Toolkit</p>
          <p className="mt-2 text-sm text-slate-400">
            ML-powered workflows for archaeologists and digital heritage teams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-white/80 transition hover:border-white/30"
          >
            <Github size={16} />
            GitHub
          </a>
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-4 py-2 text-white/80 transition hover:border-white/30"
          >
            API Docs
          </a>
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Rock Art Toolkit. All rights reserved.</p>
    </footer>
  );
}
