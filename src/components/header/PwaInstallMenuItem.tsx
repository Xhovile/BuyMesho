import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import HeaderMenuItem from "./HeaderMenuItem";
import { triggerPwaInstall } from "../PwaInstallPrompt";

type Props = {
  className: string;
  onSelect?: () => void;
};

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const minimalUi = window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || fullscreen || minimalUi || iosStandalone;
}

export default function PwaInstallMenuItem({ className, onSelect }: Props) {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const sync = () => setInstalled(detectInstalled());
    const handleInstalled = () => setInstalled(true);

    sync();
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  if (installed) return null;

  return (
    <HeaderMenuItem
      label="Install BuyMesho"
      icon={(
        <span className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center flex-shrink-0">
          <Download className="w-4 h-4 text-white" />
        </span>
      )}
      onClick={() => {
        onSelect?.();
        triggerPwaInstall();
      }}
      className={className}
    />
  );
}
