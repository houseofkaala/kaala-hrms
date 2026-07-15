export function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate border-t-gold animate-spin" />
        <p className="text-sm text-ivory-muted">Loading…</p>
      </div>
    </div>
  );
}