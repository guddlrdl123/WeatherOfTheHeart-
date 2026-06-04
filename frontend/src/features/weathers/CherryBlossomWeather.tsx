const blossomPetals = [
    { id: 1, left: "7%", size: 7, delay: "-1.4s", duration: "18s", opacity: 0.98, animation: "animate-blossom-fall" },
    { id: 2, left: "15%", size: 10, delay: "-4.2s", duration: "21s", opacity: 0.82, animation: "animate-blossom-fall-alt" },
    { id: 3, left: "23%", size: 8, delay: "-7.1s", duration: "19s", opacity: 0.72, animation: "animate-blossom-fall" },
    { id: 4, left: "31%", size: 11, delay: "-10.3s", duration: "22s", opacity: 0.78, animation: "animate-blossom-fall-alt" },
    { id: 5, left: "42%", size: 7, delay: "-13s", duration: "20s", opacity: 0.68, animation: "animate-blossom-fall" },
    { id: 6, left: "53%", size: 9, delay: "-16.2s", duration: "23s", opacity: 0.8, animation: "animate-blossom-fall-alt" },
    { id: 7, left: "61%", size: 6, delay: "-19.1s", duration: "18s", opacity: 0.94, animation: "animate-blossom-fall" },
    { id: 8, left: "70%", size: 10, delay: "-2.5s", duration: "24s", opacity: 0.76, animation: "animate-blossom-fall-alt" },
    { id: 9, left: "79%", size: 8, delay: "-5.6s", duration: "20s", opacity: 0.86, animation: "animate-blossom-fall" },
    { id: 10, left: "88%", size: 7, delay: "-8.7s", duration: "23s", opacity: 0.74, animation: "animate-blossom-fall-alt" },
    { id: 11, left: "96%", size: 9, delay: "-11.8s", duration: "19s", opacity: 0.84, animation: "animate-blossom-fall" },
    { id: 12, left: "67%", size: 6, delay: "-14.9s", duration: "22s", opacity: 0.88, animation: "animate-blossom-fall" },
    { id: 13, left: "52%", size: 10, delay: "-17.7s", duration: "21s", opacity: 0.92, animation: "animate-blossom-fall" },
    { id: 14, left: "3%", size: 9, delay: "-20.4s", duration: "24s", opacity: 0.72, animation: "animate-blossom-drift" },
    { id: 15, left: "19%", size: 6, delay: "-3.6s", duration: "18s", opacity: 0.8, animation: "animate-blossom-drift" },
    { id: 16, left: "36%", size: 8, delay: "-6.8s", duration: "22s", opacity: 0.76, animation: "animate-blossom-drift" },
    { id: 17, left: "47%", size: 5, delay: "-9.9s", duration: "19s", opacity: 0.66, animation: "animate-blossom-fall-alt" },
    { id: 18, left: "58%", size: 7, delay: "-12.6s", duration: "25s", opacity: 0.7, animation: "animate-blossom-drift" },
    { id: 19, left: "74%", size: 6, delay: "-15.7s", duration: "20s", opacity: 0.82, animation: "animate-blossom-fall" },
    { id: 20, left: "84%", size: 9, delay: "-18.8s", duration: "24s", opacity: 0.68, animation: "animate-blossom-drift" },
    { id: 21, left: "92%", size: 5, delay: "-21.5s", duration: "19s", opacity: 0.84, animation: "animate-blossom-fall-alt" },
    { id: 22, left: "11%", size: 6, delay: "-4.9s", duration: "21s", opacity: 0.74, animation: "animate-blossom-fall-alt" },
    { id: 23, left: "34%", size: 8, delay: "-14.2s", duration: "23s", opacity: 0.68, animation: "animate-blossom-drift" },
    { id: 24, left: "87%", size: 7, delay: "-22.6s", duration: "25s", opacity: 0.7, animation: "animate-blossom-fall" },
];

function CherryBlossomWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#94d5ff] via-[#ffd6e5] to-[#fff2df]" />
            <div className="absolute inset-0 bg-[#f8aac6]/16" />
            <div className="absolute left-[24%] top-[120px] h-[240px] w-[420px] -translate-x-1/2 rounded-full bg-white/32 blur-3xl" />
            <div className="absolute left-[18%] top-[40px] h-[180px] w-[460px] -translate-x-1/2 rounded-full bg-[#ffb7cf]/20 blur-3xl" />
            <div className="absolute right-[-8%] top-[8%] h-[260px] w-[360px] rounded-full bg-[#ffffff]/22 blur-3xl" />

            {blossomPetals.map((petal) => (
                <div
                    key={petal.id}
                    className={`absolute top-[-12%] ${petal.animation}`}
                    style={{
                        left: petal.left,
                        width: `${petal.size}px`,
                        height: `${petal.size * 1.45}px`,
                        opacity: petal.opacity,
                        animationDelay: petal.delay,
                        animationDuration: petal.duration,
                    }}
                >
                    <div className="h-full w-full rounded-[70%_30%_70%_30%] bg-[#ffd3df] shadow-[0_0_8px_rgba(255,177,205,0.55)]" />
                </div>
            ))}

            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#fff0e6]/24 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-white/8 backdrop-blur-[0.5px]" />

            <style>{`
                @keyframes blossomFall {
                    0% {
                        transform: translate3d(0, -8%, 0) rotate(0deg);
                    }

                    18% {
                        transform: translate3d(-38px, 18vh, 0) rotate(72deg);
                    }

                    35% {
                        transform: translate3d(72px, 36vh, 0) rotate(148deg);
                    }

                    52% {
                        transform: translate3d(12px, 55vh, 0) rotate(212deg);
                    }

                    70% {
                        transform: translate3d(-52px, 76vh, 0) rotate(292deg);
                    }

                    100% {
                        transform: translate3d(56px, 116vh, 0) rotate(440deg);
                    }
                }

                @keyframes blossomFallAlt {
                    0% {
                        transform: translate3d(0, -10%, 0) rotate(25deg);
                    }

                    16% {
                        transform: translate3d(34px, 16vh, 0) rotate(-44deg);
                    }

                    32% {
                        transform: translate3d(-74px, 34vh, 0) rotate(-124deg);
                    }

                    50% {
                        transform: translate3d(-14px, 53vh, 0) rotate(-194deg);
                    }

                    68% {
                        transform: translate3d(68px, 74vh, 0) rotate(-278deg);
                    }

                    100% {
                        transform: translate3d(-48px, 116vh, 0) rotate(-438deg);
                    }
                }

                @keyframes blossomDrift {
                    0% {
                        transform: translate3d(0, -12%, 0) rotate(10deg) scale(0.92);
                    }

                    22% {
                        transform: translate3d(98px, 24vh, 0) rotate(108deg) scale(1);
                    }

                    46% {
                        transform: translate3d(-62px, 52vh, 0) rotate(238deg) scale(0.96);
                    }

                    72% {
                        transform: translate3d(82px, 82vh, 0) rotate(368deg) scale(1.04);
                    }

                    100% {
                        transform: translate3d(-28px, 118vh, 0) rotate(528deg) scale(0.94);
                    }
                }

                .animate-blossom-fall {
                    animation: blossomFall linear infinite;
                }

                .animate-blossom-fall-alt {
                    animation: blossomFallAlt linear infinite;
                }

                .animate-blossom-drift {
                    animation: blossomDrift linear infinite;
                }
            `}</style>
        </div>
    )
}

export default CherryBlossomWeather
