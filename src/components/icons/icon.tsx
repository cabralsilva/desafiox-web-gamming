import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

export type IconSvgProps = Omit<SVGProps<SVGSVGElement>, "children">;

type IconProps = IconSvgProps & {
  children: ReactNode;
};

export function Icon({ className, children, viewBox = "0 0 16 16", strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <svg
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0", className)}
      {...props}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
