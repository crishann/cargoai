export default function BrandLogo({
  className = "",
  alt = "CarGoAI logo",
  imageClassName = "",
  label = "CarGoAI",
  subtitle = "",
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img
        src="/cargoailogo.png"
        alt={alt}
        className={`h-11 w-11 rounded-2xl border border-white/40 bg-white object-cover shadow-lg ${imageClassName}`.trim()}
      />
      <div>
        <p className="text-base font-semibold tracking-tight">{label}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
