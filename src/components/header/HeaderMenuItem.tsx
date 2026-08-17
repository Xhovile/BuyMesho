import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

type HeaderMenuItemProps = {
  label: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  className: string;
  extra?: ReactNode;
};

export default function HeaderMenuItem({ label, icon, onClick, className, extra }: HeaderMenuItemProps) {
  return (
    <button type="button" onClick={onClick} className={className} role="menuitem">
      <span className="inline-flex items-center gap-3">
        {icon}
        <span className="inline-flex items-center gap-2">
          <span>{label}</span>
          {extra}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-400" />
    </button>
  );
}
