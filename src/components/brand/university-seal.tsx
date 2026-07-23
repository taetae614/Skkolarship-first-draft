import Image from "next/image";

export default function UniversitySeal({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/skku-emblem.png"
      alt="성균관대학교"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}
