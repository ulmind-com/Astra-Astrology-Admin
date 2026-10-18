"use client";

import Image from "next/image";
import * as React from "react";

import { cn, initials } from "@/lib/utils";

const SIZES = { sm: 32, md: 44, lg: 64, xl: 112 } as const;

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const px = SIZES[size];
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-brand-700/60 to-brand-900/80",
        "font-semibold text-brand-200 ring-1 ring-brand-400/35",
        "shadow-[0_0_12px_-4px_rgb(168_85_247/0.4)]",
        className,
      )}
      style={{ width: px, height: px, fontSize: px * 0.36 }}
    >
      {showImage ? (
        <Image
          src={src!}
          alt={name ?? "Profile picture"}
          width={px}
          height={px}
          className="size-full object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
