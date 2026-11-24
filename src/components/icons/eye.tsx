import { Icon, type IconSvgProps } from "@/components/icons/icon";

export function EyeIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 8S3.7 3.75 8 3.75 14.5 8 14.5 8 12.3 12.25 8 12.25 1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="1.7" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconSvgProps) {
  return (
    <Icon {...props}>
      <path d="M2.4 6.4C3.3 7.6 5.2 9.4 8 9.4c2.8 0 4.7-1.8 5.6-3" />
      <path d="M6.4 6.5a1.7 1.7 0 0 0 2.3 2.3" />
      <path d="M2.25 12.75 13.75 3.25" />
    </Icon>
  );
}
