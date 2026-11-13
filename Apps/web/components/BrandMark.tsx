export default function BrandMark({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo.png"
      alt="Volyx Maker"
      width={size}
      height={size}
      className="inline-block shrink-0 object-contain"
      style={{ width: size, height: size }}
      decoding="async"
    />
  );
}
