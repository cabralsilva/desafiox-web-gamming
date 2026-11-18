import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function ArrowUpIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <path d="M8 13V3M8 3 4 7M8 3l4 4" />
    </Icon>
  );
}
