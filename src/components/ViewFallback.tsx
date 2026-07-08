export function ViewFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
        <p className="text-xs text-ivory-muted uppercase tracking-wider">Loading…</p>
      </div>
    </div>
  );
}