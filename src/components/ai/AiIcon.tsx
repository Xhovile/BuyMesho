import React from "react";

type Props = {
  className?: string;
  size?: number | string;
};

export default function AiIcon({ className = "w-5 h-5", size }: Props) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={style}
      aria-label="AI"
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-hidden="true"
        className="w-full h-full"
      >
        <defs>
          {/* Deep BuyMesho red */}
          <linearGradient id="redGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8F1528" />
            <stop offset="45%" stopColor="#B51F35" />
            <stop offset="100%" stopColor="#650D1D" />
          </linearGradient>

          {/* Glass highlight */}
          <linearGradient id="glassHighlight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity=".75" />
            <stop offset="35%" stopColor="white" stopOpacity=".18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* Soft depth */}
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#5C0B19"
              floodOpacity=".28"
            />
          </filter>

          {/* Subtle glass blur */}
          <filter id="softBlur">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* Main glass body */}
        <rect
          x="7"
          y="7"
          width="86"
          height="86"
          rx="23"
          fill="rgba(255,255,255,.18)"
          stroke="url(#redGlass)"
          strokeWidth="5"
          filter="url(#shadow)"
        />

        {/* Inner glass surface */}
        <rect
          x="14"
          y="14"
          width="72"
          height="72"
          rx="18"
          fill="rgba(255,255,255,.42)"
          stroke="rgba(255,255,255,.78)"
          strokeWidth="2"
        />

        {/* Red inner rim */}
        <rect
          x="18"
          y="18"
          width="64"
          height="64"
          rx="15"
          fill="none"
          stroke="#8F1528"
          strokeOpacity=".55"
          strokeWidth="2"
        />

        {/* Glass reflection */}
        <path
          d="M20 29
             Q20 19 31 19
             H70
             Q80 19 80 29
             V34
             Q51 24 20 42Z"
          fill="url(#glassHighlight)"
          opacity=".65"
        />

        {/* AI lettering */}
        <text
          x="50"
          y="63"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="38"
          fontWeight="800"
          letterSpacing="-3"
          fill="#8F1528"
        >
          AI
        </text>

        {/* Tiny highlight on lettering */}
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="38"
          fontWeight="800"
          letterSpacing="-3"
          fill="none"
          stroke="white"
          strokeOpacity=".28"
          strokeWidth=".8"
        >
          AI
        </text>
      </svg>
    </div>
  );
}
