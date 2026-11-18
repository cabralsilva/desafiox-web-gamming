import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function CloseIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <path d="M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8" />
    </Icon>
  );
}
