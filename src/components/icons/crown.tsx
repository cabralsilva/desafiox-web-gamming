import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function CrownIcon(props: IconSvgProps) {
  return (
    <Icon {...props} strokeWidth={1.5}>
      <path d="M3 12.25h10" />
      <path d="M3.25 12 2.5 5.75 6 8.25 8 3.5l2 4.75 3.5-2.5-.75 6.25" />
    </Icon>
  );
}
