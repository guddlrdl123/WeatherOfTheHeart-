const stars = [
    { id: 1, cx: 92, cy: 78, r: 1.2, opacity: 0.7 },
    { id: 2, cx: 176, cy: 52, r: 0.9, opacity: 0.55 },
    { id: 3, cx: 246, cy: 118, r: 1.1, opacity: 0.62 },
    { id: 4, cx: 398, cy: 62, r: 0.8, opacity: 0.48 },
    { id: 5, cx: 584, cy: 96, r: 1, opacity: 0.6 },
    { id: 6, cx: 742, cy: 58, r: 1.3, opacity: 0.72 },
    { id: 7, cx: 874, cy: 122, r: 0.9, opacity: 0.5 },
];

const auroraCurtains = [
    {
        id: 1,
        crest: "M -80 162 C 68 74 166 156 290 104 C 420 49 535 96 670 64 C 820 28 930 78 1080 34",
        body: "M -80 162 C 68 74 166 156 290 104 C 420 49 535 96 670 64 C 820 28 930 78 1080 34 L 1080 378 C 910 306 790 354 650 298 C 520 244 410 300 282 248 C 146 192 36 280 -80 228 Z",
        fill: "auroraEmeraldFall",
        delay: "0s",
        duration: "18s",
        opacity: 0.94,
    },
    {
        id: 2,
        crest: "M -90 248 C 78 186 178 258 314 200 C 455 140 560 212 700 158 C 842 104 956 156 1090 112",
        body: "M -90 248 C 78 186 178 258 314 200 C 455 140 560 212 700 158 C 842 104 956 156 1090 112 L 1090 438 C 930 354 820 414 690 342 C 548 264 462 344 320 300 C 178 256 34 336 -90 306 Z",
        fill: "auroraCyanFall",
        delay: "-6s",
        duration: "22s",
        opacity: 0.74,
    },
];

function DawnWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#101a34] via-[#263e70] to-[#c28e95]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_4%,rgba(99,255,219,0.3),transparent_30%),radial-gradient(circle_at_76%_18%,rgba(52,224,255,0.18),transparent_28%),radial-gradient(circle_at_22%_86%,rgba(255,195,157,0.18),transparent_30%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-[#f0aa97]/28 via-[#6d80ad]/10 to-transparent" />

            <svg
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
                viewBox="0 0 1000 700"
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                <defs>
                    <linearGradient id="auroraEmeraldFall" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d9fff0" stopOpacity="0.58" />
                        <stop offset="16%" stopColor="#5dffc1" stopOpacity="0.76" />
                        <stop offset="38%" stopColor="#21f2d0" stopOpacity="0.5" />
                        <stop offset="64%" stopColor="#2abff6" stopOpacity="0.24" />
                        <stop offset="86%" stopColor="#7b77ff" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#16305e" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="auroraCyanFall" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#c9fff5" stopOpacity="0.44" />
                        <stop offset="24%" stopColor="#36f0dd" stopOpacity="0.62" />
                        <stop offset="48%" stopColor="#2bd4ff" stopOpacity="0.38" />
                        <stop offset="72%" stopColor="#7484ff" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#13214a" stopOpacity="0" />
                    </linearGradient>
                    <filter id="auroraBodyGlow" x="-16%" y="-40%" width="132%" height="190%">
                        <feGaussianBlur stdDeviation="24" />
                    </filter>
                </defs>

                <g className="animate-star-twinkle">
                    {stars.map((star) => (
                        <circle
                            key={star.id}
                            cx={star.cx}
                            cy={star.cy}
                            r={star.r}
                            fill="#fff8df"
                            opacity={star.opacity}
                        />
                    ))}
                </g>

                {auroraCurtains.map((curtain) => (
                    <g
                        key={curtain.id}
                        className="animate-aurora-sway"
                        style={{
                            animationDelay: curtain.delay,
                            animationDuration: curtain.duration,
                            opacity: curtain.opacity,
                        }}
                    >
                        <path
                            d={curtain.crest}
                            fill="none"
                            stroke={`url(#${curtain.fill})`}
                            strokeLinecap="round"
                            strokeWidth="130"
                            opacity="0.16"
                            filter="url(#auroraBodyGlow)"
                        />
                        <path
                            d={curtain.body}
                            fill={`url(#${curtain.fill})`}
                            opacity="0.82"
                            filter="url(#auroraBodyGlow)"
                        />
                        <path
                            d={curtain.body}
                            fill={`url(#${curtain.fill})`}
                            opacity="0.24"
                            filter="url(#auroraBodyGlow)"
                        />
                    </g>
                ))}
            </svg>

            <div className="absolute inset-x-[-12%] top-[11%] z-[1] h-[190px] bg-gradient-to-b from-[#4dffd0]/22 via-[#24d7ff]/12 to-transparent blur-xl" />
            <div className="absolute inset-0 z-[3] bg-gradient-to-t from-[#273154]/16 via-transparent to-[#020617]/14" />

            <style>{`
                @keyframes auroraSway {
                    0% {
                        transform: translate3d(-1.4%, 0, 0) skewX(-1deg);
                    }

                    50% {
                        transform: translate3d(1.6%, -0.8%, 0) skewX(1.2deg);
                    }

                    100% {
                        transform: translate3d(-1.4%, 0, 0) skewX(-1deg);
                    }
                }

                @keyframes starTwinkle {
                    0%, 100% {
                        opacity: 0.44;
                    }

                    50% {
                        opacity: 0.88;
                    }
                }

                .animate-aurora-sway {
                    animation: auroraSway 18s ease-in-out infinite;
                    transform-origin: center top;
                }

                .animate-star-twinkle {
                    animation: starTwinkle 5s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

export default DawnWeather