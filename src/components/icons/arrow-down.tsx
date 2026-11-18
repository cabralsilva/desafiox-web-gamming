import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function ArrowDownIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <path d="M8 3v10M8 13 4 9M8 13l4-4" />
    </Icon>
  );
}
