function SunsetWeather() {
    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* 하늘 */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#5c4a86] via-[#d9785f] to-[#f5b35f]" />

            {/* 태양 빛 */}
            <div className="absolute inset-x-[-12%] top-[170px] h-[430px] bg-[radial-gradient(ellipse_at_24%_45%,rgba(255,211,138,0.45),rgba(255,169,86,0.22)_28%,rgba(255,116,87,0.12)_58%,transparent_76%)] blur-3xl" />
            <div className="absolute inset-x-[-8%] top-[260px] h-[260px] bg-[linear-gradient(90deg,rgba(255,214,138,0.28),rgba(255,165,82,0.22),rgba(255,115,89,0.16),rgba(255,214,138,0.18))] blur-3xl" />

            <div className="absolute left-[24%] top-[245px] h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-orange-200/35 blur-2xl" />

            {/* 태양 */}
            <div className="absolute left-[24%] top-[280px] h-[100px] w-[100px] -translate-x-1/2 rounded-full bg-[#ffd18a]/85 shadow-[0_0_70px_rgba(255,164,76,0.72)]" />

            <div
                className="absolute left-[24%] top-[350px] h-[104px] w-[380px] -translate-x-1/2 overflow-hidden"
                style={{
                    WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, transparent 0%, #000 22%, #000 78%, transparent 100%)",
                }}
            >
                <div className="absolute bottom-[-22px] left-1/2 h-[190px] w-[280px] -translate-x-1/2 rounded-full bg-[#ffd18a]/35 blur-2xl" />
                <div className="absolute bottom-[-2px] left-1/2 h-[164px] w-[164px] -translate-x-1/2 rounded-full bg-[#ffd18a]/58 blur-lg" />
            </div>

            <div className="absolute bottom-0 left-0 h-[300px] w-full bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <div className="absolute inset-0 bg-orange-300/20 backdrop-blur-[1px]" />
            <div className="absolute inset-0 bg-orange-500/5" />
            <div className="absolute inset-0 bg-white/10 animate-cloud" />

        </div>
    )
}

export default SunsetWeather
