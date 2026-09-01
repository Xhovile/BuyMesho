const ACCORDION_TITLES = new Set([
  "Adjustments",
  "Seller payout access",
  "Destination verification",
]);

const DIAGNOSTIC_TITLE = "More diagnostic detail";
const SILENCED_VALUE_LABELS = new Set([
  "Release entry",
  "Requested by",
  "Escrow ID",
  "Provider reference",
  "Provider charge",
  "Provider transaction",
  "Latest webhook",
  "Latest audit",
]);
const STYLE_ID = "buymesho-payout-accordion-styles";
const SILENCED_CLASS = "buymesho-payout-silenced-value";

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-payout-accordion] {
      border-radius: 1.5rem !important;
      overflow: hidden;
      border-width: 1px !important;
      border-left-width: 1px !important;
      border-right-width: 1px !important;
    }

    [data-payout-accordion] > :first-child {
      position: relative;
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      user-select: none;
      border-radius: 1rem !important;
    }

    [data-payout-accordion] > :first-child::after {
      content: "";
      width: 0.65rem;
      height: 0.65rem;
      flex: 0 0 auto;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg) translateY(-2px);
      transform-origin: center;
      opacity: 0.7;
      transition: transform 160ms ease, opacity 160ms ease;
    }

    [data-payout-accordion][data-payout-open="true"] > :first-child::after {
      transform: rotate(225deg) translate(-2px, -2px);
      opacity: 1;
    }

    [data-payout-accordion][data-payout-open="false"] > :nth-child(2) {
      display: none !important;
    }

    [data-payout-accordion] > :first-child:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: -2px;
      border-radius: 1rem !important;
    }

    [data-payout-diagnostic] > summary {
      cursor: default !important;
      user-select: text !important;
      pointer-events: none !important;
      list-style: none !important;
    }

    [data-payout-diagnostic] > summary::-webkit-details-marker {
      display: none;
    }

    .${SILENCED_CLASS} {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

function getPanelTitle(section: Element) {
  return section.querySelector(":scope > :first-child h2")?.textContent?.trim() ?? "";
}

function enhanceAccordion(section: HTMLElement) {
  if (section.dataset.payoutAccordion === "true") return;
  if (!ACCORDION_TITLES.has(getPanelTitle(section))) return;
  if (section.children.length < 2) return;

  const header = section.firstElementChild as HTMLElement | null;
  if (!header) return;

  section.dataset.payoutAccordion = "true";
  section.dataset.payoutOpen = "false";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "false");
  header.style.borderRadius = "1rem";

  const toggle = () => {
    const open = section.dataset.payoutOpen !== "true";
    section.dataset.payoutOpen = String(open);
    header.setAttribute("aria-expanded", String(open));
  };

  header.addEventListener("click", toggle);
  header.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
}

function lockDiagnosticOpen(details: HTMLDetailsElement) {
  const title = details.querySelector(":scope > summary")?.textContent?.trim();
  if (title !== DIAGNOSTIC_TITLE) return;
  if (details.dataset.payoutDiagnostic === "true") {
    details.open = true;
    return;
  }

  details.dataset.payoutDiagnostic = "true";
  details.open = true;
  const summary = details.querySelector(":scope > summary");
  summary?.setAttribute("aria-expanded", "true");
  summary?.setAttribute("role", "heading");
  summary?.addEventListener("click", (event) => event.preventDefault());
  summary?.addEventListener("keydown", (event) => {
    event.preventDefault();
    details.open = true;
  });
}

function silenceInternalValues() {
  document
    .querySelectorAll<HTMLElement>("[data-admin-payout-workspace] p")
    .forEach((label) => {
      const text = label.textContent?.trim() ?? "";
      if (!SILENCED_VALUE_LABELS.has(text)) return;
      const valueBlock = label.parentElement;
      if (!valueBlock) return;
      valueBlock.classList.add(SILENCED_CLASS);
      label.setAttribute("aria-hidden", "true");
    });
}

function scan() {
  document
    .querySelectorAll<HTMLElement>("[data-admin-payout-workspace] section")
    .forEach((section) => {
      enhanceAccordion(section);
    });

  document
    .querySelectorAll<HTMLDetailsElement>("[data-admin-payout-workspace] details")
    .forEach(lockDiagnosticOpen);

  silenceInternalValues();
}

function init() {
  installStyles();
  scan();

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
