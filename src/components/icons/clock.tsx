import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function ClockIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.25" />
      <path d="M8 5.25V8l1.75 1.25" />
    </Icon>
  );
}
