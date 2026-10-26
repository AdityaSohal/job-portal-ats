// Decorative: flat slabs floating at different heights, drawn with CSS 3D (see index.css)
export default function IsoScene({ className = "" }) {
  return (
    <div className={`iso-scene h-[320px] w-full max-w-[420px] ${className}`} aria-hidden="true">
      <div className="iso-stage">
        <div className="iso-slab iso-slab-shadow" />
        <div className="iso-slab iso-slab-base" />
        <div className="iso-slab iso-slab-mid">
          <span className="iso-chip" />
        </div>
        <div className="iso-slab iso-slab-top">
          <div className="iso-avatar" />
          <div className="iso-bar w-3/4" />
          <div className="iso-bar w-1/2" />
          <div className="iso-bar w-2/3" />
        </div>
      </div>
    </div>
  );
}