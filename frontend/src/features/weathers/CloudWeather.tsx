const cloudLayers = [
    { id: 1, top: "12%", left: "-10%", width: "42%", height: "18%", delay: "0s", duration: "18s", opacity: 0.28 },
    { id: 2, top: "26%", left: "18%", width: "54%", height: "24%", delay: "-6s", duration: "24s", opacity: 0.22 },
    { id: 3, top: "44%", left: "-18%", width: "70%", height: "28%", delay: "-12s", duration: "30s", opacity: 0.2 },
    { id: 4, top: "58%", left: "36%", width: "58%", height: "22%", delay: "-3s", duration: "26s", opacity: 0.18 },
];

const windowClouds = [
    { id: 1, top: "6%", left: "-18%", width: "340px", height: "112px", delay: "-4s", duration: "38s", opacity: 0.32, shade: "rgba(238,242,244,0.58)", shadow: "rgba(119,130,139,0.28)", blur: "5px", stretch: 1.08 },
    { id: 2, top: "14%", left: "6%", width: "220px", height: "78px", delay: "-14s", duration: "44s", opacity: 0.27, shade: "rgba(232,237,240,0.48)", shadow: "rgba(105,116,126,0.24)", blur: "7px", stretch: 1.18 },
    { id: 3, top: "5%", left: "42%", width: "410px", height: "132px", delay: "-20s", duration: "48s", opacity: 0.34, shade: "rgba(245,247,247,0.54)", shadow: "rgba(126,135,143,0.32)", blur: "6px", stretch: 1.02 },
    { id: 4, top: "30%", left: "16%", width: "300px", height: "96px", delay: "-8s", duration: "40s", opacity: 0.36, shade: "rgba(235,239,241,0.52)", shadow: "rgba(105,116,126,0.3)", blur: "6px", stretch: 1.2 },
    { id: 5, top: "24%", left: "65%", width: "250px", height: "86px", delay: "-28s", duration: "50s", opacity: 0.3, shade: "rgba(230,235,238,0.46)", shadow: "rgba(101,113,124,0.26)", blur: "8px", stretch: 1.24 },
    { id: 6, top: "43%", left: "-6%", width: "380px", height: "116px", delay: "-22s", duration: "46s", opacity: 0.32, shade: "rgba(242,244,244,0.5)", shadow: "rgba(111,122,132,0.32)", blur: "7px", stretch: 1.12 },
    { id: 7, top: "47%", left: "38%", width: "290px", height: "90px", delay: "-12s", duration: "52s", opacity: 0.27, shade: "rgba(232,236,239,0.45)", shadow: "rgba(99,111,121,0.28)", blur: "8px", stretch: 1.32 },
    { id: 8, top: "39%", left: "78%", width: "360px", height: "104px", delay: "-30s", duration: "54s", opacity: 0.29, shade: "rgba(236,240,242,0.48)", shadow: "rgba(108,120,130,0.3)", blur: "7px", stretch: 1.16 },
    { id: 9, top: "11%", left: "92%", width: "180px", height: "62px", delay: "-27s", duration: "48s", opacity: 0.24, shade: "rgba(235,238,240,0.42)", shadow: "rgba(97,109,120,0.24)", blur: "9px", stretch: 1.38 },
];

function CloudWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#65707c] via-[#9ca5ae] to-[#c5c8c8]" />
            <div className="absolute inset-0 bg-[#4b5563]/20 backdrop-blur-[2px]" />
            <div className="absolute left-1/2 top-8 h-[260px] w-[560px] -translate-x-1/2 rounded-full bg-white/12 blur-3xl" />

            {windowClouds.map((cloud) => (
                <div
                    key={cloud.id}
                    className="absolute animate-window-cloud"
                    style={{
                        top: cloud.top,
                        left: cloud.left,
                        width: cloud.width,
                        height: cloud.height,
                        opacity: cloud.opacity,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                        filter: `blur(${cloud.blur})`,
                        transformOrigin: "center",
                    }}
                >
                    <div
                        className="absolute bottom-[10%] left-[2%] h-[46%] w-[94%] rounded-[50%] blur-[1px]"
                        style={{ background: cloud.shade, transform: `scaleY(${cloud.stretch})` }}
                    />
                    <div
                        className="absolute bottom-[22%] left-[8%] h-[58%] w-[48%] rounded-[48%] blur-[2px]"
                        style={{ background: cloud.shade, transform: "rotate(-4deg)" }}
                    />
                    <div
                        className="absolute bottom-[30%] left-[38%] h-[70%] w-[44%] rounded-[46%] blur-[3px]"
                        style={{ background: cloud.shade, transform: "rotate(6deg)" }}
                    />
                    <div
                        className="absolute bottom-[18%] left-[62%] h-[48%] w-[34%] rounded-[52%] blur-[3px]"
                        style={{ background: cloud.shade, transform: "rotate(-8deg)" }}
                    />
                    <div
                        className="absolute bottom-[2%] left-[7%] h-[34%] w-[86%] rounded-[50%] blur-[4px]"
                        style={{ background: cloud.shadow }}
                    />
                    <div className="absolute bottom-[18%] left-[18%] h-[16%] w-[68%] rounded-full bg-white/20 blur-xl" />
                </div>
            ))}

            {cloudLayers.map((cloud) => (
                <div
                    key={cloud.id}
                    className="absolute rounded-full bg-white blur-3xl animate-heavy-cloud"
                    style={{
                        top: cloud.top,
                        left: cloud.left,
                        width: cloud.width,
                        height: cloud.height,
                        opacity: cloud.opacity,
                        animationDelay: cloud.delay,
                        animationDuration: cloud.duration,
                    }}
                />
            ))}

            <div className="absolute inset-0 bg-gradient-to-b from-[#27313d]/18 via-transparent to-[#39414a]/20" />
            <div className="absolute inset-0 bg-gray-900/15" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white/10 blur-2xl animate-cloud-fog" />

            <style>{`
                @keyframes heavyCloud {
                    0% {
                        transform: translateX(-8%) scale(1);
                    }

                    50% {
                        transform: translateX(12%) scale(1.08);
                    }

                    100% {
                        transform: translateX(-8%) scale(1);
                    }
                }

                @keyframes cloudFog {
                    0% {
                        opacity: 0.18;
                        transform: translateX(-4%);
                    }

                    50% {
                        opacity: 0.3;
                        transform: translateX(4%);
                    }

                    100% {
                        opacity: 0.18;
                        transform: translateX(-4%);
                    }
                }

                .animate-heavy-cloud {
                    animation: heavyCloud ease-in-out infinite;
                }

                .animate-window-cloud {
                    animation: windowCloud ease-in-out infinite;
                }

                .animate-cloud-fog {
                    animation: cloudFog 12s ease-in-out infinite;
                }

                @keyframes windowCloud {
                    0% {
                        transform: translateX(-10%) scale(0.98);
                    }

                    50% {
                        transform: translateX(16%) scale(1.03);
                    }

                    100% {
                        transform: translateX(-10%) scale(0.98);
                    }
                }
            `}</style>
        </div>
    )
}

export default CloudWeather
