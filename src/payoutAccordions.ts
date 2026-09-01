const TARGET_TITLES = new Set([
  "Adjustments",
  "Seller payout access",
  "Destination verification",
]);

const STYLE_ID = "buymesho-payout-accordion-styles";

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    [data-payout-accordion] > :first-child {
      position: relative;
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      cursor: pointer;
      user-select: none;
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
      border-radius: 0.75rem;
    }
  `;
  document.head.appendChild(style);
}

function getTitle(section: Element) {
  return section.querySelector(":scope > :first-child h2")?.textContent?.trim() ?? "";
}

function enhance(section: HTMLElement) {
  if (section.dataset.payoutAccordion === "true") return;
  if (!TARGET_TITLES.has(getTitle(section))) return;
  if (section.children.length < 2) return;

  const header = section.firstElementChild as HTMLElement | null;
  if (!header) return;

  section.dataset.payoutAccordion = "true";
  section.dataset.payoutOpen = "true";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "true");

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

function scan() {
  document.querySelectorAll<HTMLElement>(
    '[data-admin-payout-workspace] section'
  ).forEach(enhance);
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
