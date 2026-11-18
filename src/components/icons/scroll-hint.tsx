import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function ScrollHintIcon(props: IconSvgProps) {
  return (
    <Icon {...props} viewBox="0 0 28 10" strokeWidth={1.5}>
      <path d="M7 1 2 5l5 4M21 1l5 4-5 4M3 5h22" />
    </Icon>
  );
}
