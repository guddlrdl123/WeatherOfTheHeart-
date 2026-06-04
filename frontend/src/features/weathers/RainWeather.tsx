const rainDrops = Array.from({ length: 120 }, (_, i) => ({
    duration: Math.random() * 0.8 + 0.6,
    id: i,
    left: Math.random() * 100,
    top: -80 - Math.random() * 240,
    opacity: Math.random() * 0.5 + 0.2,
})).map((drop) => ({
    ...drop,
    delay: -Math.random() * drop.duration,
}));

function RainWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">

            {/* 흐린 하늘 */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-600 to-slate-500" />

            {/* 안개 느낌 */}
            <div className="absolute inset-0 bg-slate-400/20 backdrop-blur-[2px]" />

            {/* 흐린 빛 */}
            <div className="absolute left-1/2 top-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-slate-300/10 blur-3xl" />

            {/* 빗줄기 */}
            {rainDrops.map((drop) => (
                <div
                    key={drop.id}
                    className="absolute animate-rain bg-white/60"
                    style={{
                        left: `${drop.left}%`,
                        top: `${drop.top}px`,
                        width: '1.5px',
                        height: '60px',
                        opacity: drop.opacity,
                        animationDuration: `${drop.duration}s`,
                        animationDelay: `${drop.delay}s`,
                        animationFillMode: "both",
                    }}
                />
            ))}

            {/* 유리창 흐림 느낌 */}
            <div className="absolute inset-0 bg-slate-900/10" />

            {/* 빗방울 blur */}
            <div className="absolute inset-0 backdrop-blur-[1px]" />

            {/* CSS */}
            <style>{`
                @keyframes rain {
                    0% {
                        transform: translate(80px, -120px) rotate(12deg);
                        opacity: 0;
                    }

                    10% {
                        opacity: 1;
                    }

                    100% {
                        transform: translate3d(-140px, 120vh, 0) rotate(8deg);
                        opacity: 0;
                    }
                }

                .animate-rain {
                    animation: rain linear infinite;
                }
            `}</style>
        </div>
    )
}

export default RainWeather
