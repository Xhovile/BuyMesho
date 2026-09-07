import type { SVGProps } from "react";

export default function BuyBasketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M135 166 C145 125 175 95 218 95 H294 C337 95 367 125 377 166"
        fill="none"
        stroke="currentColor"
        strokeWidth="28"
        strokeLinecap="round"
      />
      <rect x="75" y="162" width="362" height="55" rx="18" fill="currentColor" />
      <path
        d="M92 222 L420 222 L396 359 C392 384 374 399 350 399 H162 C138 399 120 384 116 359 Z"
        fill="currentColor"
      />
      <rect x="145" y="245" width="25" height="105" rx="12" fill="white" />
      <rect x="218" y="245" width="25" height="105" rx="12" fill="white" />
      <rect x="291" y="245" width="25" height="105" rx="12" fill="white" />
      <circle cx="357" cy="352" r="91" fill="white" stroke="currentColor" strokeWidth="24" />
      <path
        d="M315 352 L345 382 L405 315"
        fill="none"
        stroke="currentColor"
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
