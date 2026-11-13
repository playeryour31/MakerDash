/** Volyx-style ambient: void + grid + soft orbs + vignette */
export default function AmbientBackground() {
  return (
    <div className="ambient-root" aria-hidden="true">
      <div className="ambient-void" />
      <div className="ambient-grid" />
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-vignette" />
    </div>
  );
}
