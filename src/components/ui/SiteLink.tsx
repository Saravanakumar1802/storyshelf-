import NextLink from "next/link";
import type { ComponentProps } from "react";
import { isRouteEnabled } from "@/config/features";
import { cn } from "@/lib/utils";

type Props = ComponentProps<typeof NextLink>;

/**
 * The site's internal link. A link to a screen that is switched off (see
 * src/config/features.ts) keeps its look but renders as inert text: it can't
 * be followed, focused or prefetched.
 */
export default function SiteLink({ href, className, style, children, ...rest }: Props) {
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  if (path && !isRouteEnabled(path)) {
    return (
      <span aria-disabled="true" title="Coming soon" className={cn(className, "link-off")} style={style}>
        {children}
      </span>
    );
  }
  return (
    <NextLink href={href} className={className} style={style} {...rest}>
      {children}
    </NextLink>
  );
}
