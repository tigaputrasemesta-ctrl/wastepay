#!/usr/bin/env python3
"""Mechanical re-theme sweep: legacy light/emerald tokens -> industrial dark system."""
import re, pathlib, sys

ROOT = pathlib.Path("src")

# Ordered (first-match-wins) replacements: (old, new)
REPL = [
    # -- bg-white variants (order matters: /xx before bare) --
    (r"bg-white/60", "bg-asphalt-deep/80"),
    (r"bg-white/80", "bg-asphalt-deep/90"),
    (r"bg-white/50", "bg-asphalt-deep/60"),
    (r"bg-white/40", "bg-asphalt-deep/50"),
    (r"bg-white/30", "bg-asphalt-deep/40"),
    (r"bg-white/20", "bg-asphalt-deep/30"),
    (r"bg-white/10", "bg-asphalt-deep/20"),
    # structural card -> panel
    (r"bg-white rounded-xl border border-gray-200", "panel"),
    (r"bg-white rounded-xl border", "panel"),
    (r"bg-white rounded-xl", "panel"),
    (r"\bbg-white\b", "bg-panel"),
    # -- grays --
    (r"hover:bg-gray-50", "hover:bg-asphalt-raised"),
    (r"bg-gray-50", "bg-asphalt-deep/40"),
    (r"bg-gray-100", "bg-asphalt-raised"),
    (r"bg-gray-200", "bg-asphalt-raised"),
    (r"bg-gray-300", "bg-asphalt-raised"),
    (r"bg-gray-700", "bg-asphalt-raised"),
    (r"bg-gray-800", "bg-asphalt-raised"),
    (r"bg-gray-900", "bg-asphalt-deep"),
    (r"border-gray-200", "border-asphalt-line"),
    (r"border-gray-300", "border-asphalt-line"),
    (r"border-gray-100", "border-asphalt-line"),
    (r"divide-gray-200", "divide-asphalt-line"),
    (r"divide-gray-100", "divide-asphalt-line"),
    (r"ring-gray-300", "ring-asphalt-line"),
    (r"text-gray-900", "text-bone"),
    (r"text-gray-800", "text-bone"),
    (r"text-gray-700", "text-bone-dim"),
    (r"text-gray-600", "text-bone-dim"),
    (r"text-gray-500", "text-bone-dim"),
    (r"text-gray-400", "text-bone-faint"),
    (r"text-gray-300", "text-bone-faint"),
    (r"placeholder-gray-400", "placeholder:text-bone-faint"),
    (r"bg-slate-100", "bg-asphalt-raised"),
    (r"bg-slate-50", "bg-asphalt-deep/40"),
    (r"text-slate-600", "text-bone-dim"),
    (r"text-slate-500", "text-bone-dim"),
    (r"text-slate-400", "text-bone-faint"),
    (r"border-slate-200", "border-asphalt-line"),
    (r"border-slate-300", "border-asphalt-line"),
    # -- emerald -> vest (primary action) --
    (r"bg-emerald-600 text-white", "bg-vest text-asphalt-deep"),
    (r"bg-emerald-500 text-white", "bg-vest text-asphalt-deep"),
    (r"hover:bg-emerald-700", "hover:bg-vest-bright"),
    (r"hover:bg-emerald-600", "hover:bg-vest-bright"),
    (r"hover:bg-emerald-100", "hover:bg-vest/10"),
    (r"hover:bg-emerald-50", "hover:bg-vest/5"),
    (r"bg-emerald-100", "bg-vest/10"),
    (r"bg-emerald-50", "bg-vest/5"),
    (r"bg-emerald-600", "bg-vest"),
    (r"bg-emerald-500", "bg-vest"),
    (r"bg-emerald-400", "bg-vest"),
    (r"text-emerald-600", "text-vest"),
    (r"text-emerald-500", "text-vest"),
    (r"text-emerald-700", "text-vest"),
    (r"text-emerald-400", "text-vest"),
    (r"border-emerald-200", "border-vest/40"),
    (r"border-emerald-300", "border-vest/40"),
    (r"border-emerald-500", "border-vest"),
    (r"border-emerald-600", "border-vest"),
    (r"hover:border-emerald-300", "hover:border-vest/60"),
    (r"hover:text-emerald-600", "hover:text-vest"),
    (r"hover:text-emerald-500", "hover:text-vest"),
    (r"focus:ring-emerald-500", "focus:ring-vest"),
    (r"focus:border-emerald-500", "focus:border-vest"),
    (r"focus:border-emerald-300", "focus:border-vest"),
    (r"ring-emerald-500", "ring-vest"),
    (r"shadow-emerald-200", "shadow-vest/20"),
    (r"shadow-emerald-100", "shadow-vest/10"),
    # -- blue -> vest --
    (r"bg-blue-100", "bg-vest/10"),
    (r"bg-blue-50", "bg-vest/5"),
    (r"text-blue-600", "text-vest"),
    (r"text-blue-500", "text-vest"),
    (r"text-blue-700", "text-vest"),
    (r"border-blue-200", "border-vest/40"),
    (r"bg-blue-500 text-white", "bg-vest text-asphalt-deep"),
    (r"bg-blue-600 text-white", "bg-vest text-asphalt-deep"),
    (r"hover:bg-blue-700", "hover:bg-vest-bright"),
    # -- orange -> amber --
    (r"bg-orange-100", "bg-amber/10"),
    (r"bg-orange-50", "bg-amber/5"),
    (r"text-orange-600", "text-amber"),
    (r"text-orange-500", "text-amber"),
    (r"text-orange-700", "text-amber"),
    (r"border-orange-200", "border-amber/40"),
    (r"hover:bg-orange-50", "hover:bg-amber/5"),
    # -- red -> danger --
    (r"bg-red-600 text-white", "bg-danger text-white"),
    (r"bg-red-500 text-white", "bg-danger text-white"),
    (r"bg-red-100", "bg-danger/10"),
    (r"bg-red-50", "bg-danger/5"),
    (r"text-red-600", "text-danger"),
    (r"text-red-500", "text-danger"),
    (r"border-red-200", "border-danger/40"),
    (r"bg-red-500", "bg-danger"),
    (r"bg-red-600", "bg-danger"),
    (r"hover:bg-red-700", "hover:bg-danger-deep"),
    (r"hover:bg-red-600", "hover:bg-danger-deep"),
    (r"hover:bg-red-50", "hover:bg-danger/5"),
    (r"hover:text-red-600", "hover:text-danger"),
    # -- amber/teal/sky/purple/indigo/rose/yellow --
    (r"text-amber-500", "text-amber"),
    (r"text-amber-600", "text-amber"),
    (r"text-amber-700", "text-amber"),
    (r"bg-amber-100", "bg-amber/10"),
    (r"bg-amber-50", "bg-amber/5"),
    (r"border-amber-300", "border-amber/50"),
    (r"border-amber-400", "border-amber/60"),
    (r"text-teal-600", "text-vest"),
    (r"bg-teal-100", "bg-vest/10"),
    (r"bg-teal-50", "bg-vest/5"),
    (r"text-sky-600", "text-vest"),
    (r"bg-sky-100", "bg-vest/10"),
    (r"bg-purple-100", "bg-asphalt-raised"),
    (r"text-purple-600", "text-bone-dim"),
    (r"bg-indigo-100", "bg-asphalt-raised"),
    (r"text-indigo-600", "text-bone-dim"),
    (r"text-rose-600", "text-danger"),
    (r"bg-rose-100", "bg-danger/10"),
    (r"bg-rose-50", "bg-danger/5"),
    (r"text-yellow-600", "text-amber"),
    (r"bg-yellow-100", "bg-amber/10"),
    # -- chamfer on vest elements (buttons + chips) --
    (r" bg-vest text-asphalt-deep", " chamfer-sm bg-vest text-asphalt-deep"),
    # -- headings -> display font --
    (r"text-2xl font-bold text-bone", "font-display text-2xl text-bone"),
    (r"text-xl font-bold text-bone", "font-display text-xl text-bone"),
    (r"text-lg font-bold text-bone", "font-display text-lg text-bone"),
    (r"text-lg font-semibold text-bone", "font-display text-lg text-bone"),
    (r"text-base font-bold text-bone", "font-display text-base text-bone"),
    # -- modal overlays --
    (r"bg-black/50", "bg-asphalt-deep/70"),
    (r"bg-black/40", "bg-asphalt-deep/60"),
    (r"bg-black/60", "bg-asphalt-deep/80"),
]

files = list(ROOT.rglob("*.tsx"))
total = 0
for f in files:
    orig = f.read_text(encoding="utf-8")
    new = orig
    for pat, rep in REPL:
        new = re.sub(pat, rep, new)
    if new != orig:
        n = sum(len(re.findall(p, orig)) for p, _ in REPL)
        total += n
        f.write_text(new, encoding="utf-8")
        print(f"{f} ({n} replacements)")
print(f"\nTotal replacements: {total}")
