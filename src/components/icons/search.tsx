import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function SearchIcon(props: IconSvgProps) {
  return (
    <Icon {...props} strokeWidth={1.5}>
      <circle cx="6.75" cy="6.75" r="4" />
      <path d="M10 10.25 13.25 13.5" />
    </Icon>
  );
}
