import { useEffect } from "react";
import AdminPayoutsManager from "./AdminPayoutsManager";

const HIDDEN_SUMMARY_LABELS = new Set([
  "provider charge",
  "last attempt",
  "audit snapshot",
]);

function hideTechnicalRowSummaries(root: ParentNode = document): void {
  const candidates = Array.from(root.querySelectorAll("p"));

  for (const candidate of candidates) {
    const label = candidate.textContent?.trim().toLowerCase();
    if (!label || !HIDDEN_SUMMARY_LABELS.has(label)) continue;

    if (candidate.closest("aside")) {
      continue;
    }

    const card = candidate.parentElement;
    if (card instanceof HTMLElement) {
      card.style.display = "none";
    }
  }
}

export default function AdminPayoutsManagerDisplay() {
  useEffect(() => {
    let rafId = 0;

    const apply = () => {
      hideTechnicalRowSummaries(document);
    };

    apply();
    rafId = window.requestAnimationFrame(apply);

    const observer = new MutationObserver(() => {
      hideTechnicalRowSummaries(document);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      observer.disconnect();
    };
  }, []);

  return <AdminPayoutsManager />;
}
