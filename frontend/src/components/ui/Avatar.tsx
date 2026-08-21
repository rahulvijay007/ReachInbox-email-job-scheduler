export function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const style = { width: size, height: size };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={style} className="rounded-full object-cover" />;
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white"
    >
      {initial}
    </div>
  );
}
