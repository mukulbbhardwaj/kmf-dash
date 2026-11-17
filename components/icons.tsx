import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Base>
);
export const ListIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </Base>
);
export const PlusIcon = (p: IconProps) => (
  <Base strokeWidth={2.5} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const MinusIcon = (p: IconProps) => (
  <Base strokeWidth={2.5} {...p}>
    <path d="M5 12h14" />
  </Base>
);
export const PillIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m10.5 20.5-7-7a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z" />
    <path d="m8.5 8.5 7 7" />
  </Base>
);
export const FeedIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 22V8M12 8c0-3 2-5 5-5 0 3-2 5-5 5ZM12 8c0-3-2-5-5-5 0 3 2 5 5 5ZM12 15c0-3 2-5 5-5 0 3-2 5-5 5ZM12 15c0-3-2-5-5-5 0 3 2 5 5 5Z" />
  </Base>
);
export const HeartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 12 5a5.5 5.5 0 0 0-10 3.5c0 2.3 1.5 4 3 5.5l7 7Z" />
  </Base>
);
export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 18 6-6-6-6" />
  </Base>
);
export const BackIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m15 18-6-6 6-6" />
  </Base>
);
export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base strokeWidth={2.5} {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Base>
);
export const InfoIcon = (p: IconProps) => (
  <Base strokeWidth={2.5} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </Base>
);
export const AlertIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Base>
);
export const DropIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
  </Base>
);
export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Base>
);
export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Base>
);
