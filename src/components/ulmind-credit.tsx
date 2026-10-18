import Image from "next/image";

/**
 * The maker's credit, shown at the foot of every app — the public site, the
 * admin panel and the astrologer panel alike.
 *
 * The logo is a light mark on transparency, so it sits on the night sky
 * without a plate behind it. Kept quiet by default and lit on hover: a credit
 * should be findable, not louder than the product.
 */
export function UlmindCredit({ className }: { className?: string }) {
  return (
    <a
      href="https://ulmind.com"
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group inline-flex items-center gap-2.5 rounded-full border border-border",
        "bg-surface-muted/60 px-4 py-2 transition-colors hover:border-border-strong",
        className ?? "",
      ].join(" ")}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Designed &amp; developed by
      </span>
      <Image
        src="/ulmind.png"
        alt="ULMiND"
        width={480}
        height={162}
        // Fixed height so the mark keeps its proportions whatever the source
        // file is. Tall enough that the owl's detail survives — at half this
        // it turns into a smudge. Shown at full strength: dimming someone's
        // brand red to suit a dark page is not ours to do.
        className="h-7 w-auto"
      />
    </a>
  );
}
