type Star = {
    id: number;
    left: string;
    top: string;
    size: number;
    delay: string;
    opacity?: number;
    duration?: string;
};

const stars: Star[] = [
    { id: 1, left: "16%", top: "14%", size: 2, delay: "0s" },
    { id: 2, left: "28%", top: "25%", size: 1.5, delay: "-1.2s" },
    { id: 3, left: "30%", top: "11%", size: 2.5, delay: "-0.7s" },
    { id: 4, left: "10%", top: "22%", size: 1.5, delay: "-1.8s" },
    { id: 5, left: "20%", top: "15%", size: 2, delay: "-0.4s" },
    { id: 6, left: "14%", top: "34%", size: 1.5, delay: "-2s" },
    { id: 7, left: "33%", top: "40%", size: 1.5, delay: "-1.5s" },
    { id: 8, left: "25%", top: "47%", size: 2, delay: "-0.9s" },
    { id: 9, left: "18%", top: "45%", size: 1.5, delay: "0s" },
    { id: 10, left: "12%", top: "52%", size: 2, delay: "-1.8s" },
    { id: 11, left: "42%", top: "10%", size: 1.5, delay: "-0.3s", opacity: 0.62, duration: "3.8s" },
    { id: 12, left: "50%", top: "19%", size: 2, delay: "-1.6s", opacity: 0.78, duration: "3.2s" },
    { id: 13, left: "59%", top: "8%", size: 1.5, delay: "-2.4s", opacity: 0.64, duration: "4s" },
    { id: 14, left: "68%", top: "24%", size: 2.5, delay: "-0.8s", opacity: 0.72, duration: "3.6s" },
    { id: 15, left: "78%", top: "13%", size: 2, delay: "-2s", opacity: 0.82, duration: "3.3s" },
    { id: 16, left: "88%", top: "28%", size: 1.5, delay: "-1.2s", opacity: 0.68, duration: "4.2s" },
    { id: 17, left: "95%", top: "16%", size: 2, delay: "-2.7s", opacity: 0.76, duration: "3.5s" },
    { id: 18, left: "44%", top: "39%", size: 2, delay: "-1.9s", opacity: 0.7, duration: "3.7s" },
    { id: 19, left: "55%", top: "48%", size: 1.5, delay: "-0.5s", opacity: 0.58, duration: "4.4s" },
    { id: 20, left: "64%", top: "38%", size: 2, delay: "-2.9s", opacity: 0.8, duration: "3.4s" },
    { id: 21, left: "73%", top: "52%", size: 2.5, delay: "-1.4s", opacity: 0.74, duration: "3.9s" },
    { id: 22, left: "84%", top: "43%", size: 1.5, delay: "-0.1s", opacity: 0.66, duration: "4.1s" },
    { id: 23, left: "92%", top: "57%", size: 2, delay: "-2.3s", opacity: 0.72, duration: "3.5s" },
    { id: 24, left: "38%", top: "63%", size: 1.5, delay: "-0.9s", opacity: 0.56, duration: "4.5s" },
];

function NightWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#070b19] via-[#111a32] to-[#1a2438]" />
            <div className="absolute inset-0 bg-[#02040d]/30" />

            <div
                className="absolute left-[24%] top-[120px] h-[88px] w-[88px] rounded-full bg-[#dce7ff]"
                style={{
                    WebkitMaskImage: "radial-gradient(circle at 64% 42%, transparent 0 45%, #000 46% 100%)",
                    maskImage: "radial-gradient(circle at 64% 42%, transparent 0 50%, #000 46% 100%)",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskSize: "100% 100%",
                    maskSize: "100% 100%",
                    filter: "drop-shadow(0 0 26px rgba(181,201,255,0.78))",
                }}
            />

            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-white/80 animate-night-star"
                    style={{
                        left: star.left,
                        top: star.top,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        animationDelay: star.delay,
                        animationDuration: star.duration ?? "3s",
                        opacity: star.opacity ?? 0.8,
                    }}
                />
            ))}

            <div className="absolute left-1/2 top-[150px] h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-[#8aa4d6]/10 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-[#0b1024]/20" />

            <style>{`
                @keyframes nightStar {
                    0%, 100% {
                        opacity: 0.35;
                        transform: scale(0.85);
                    }

                    50% {
                        opacity: 1;
                        transform: scale(1.2);
                    }
                }

                .animate-night-star {
                    animation: nightStar 3s ease-in-out infinite;
                }

            `}</style>
        </div>
    )
}

export default NightWeather
