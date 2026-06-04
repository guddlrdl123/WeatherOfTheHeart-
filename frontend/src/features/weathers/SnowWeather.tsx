import type { CSSProperties } from "react";

const snowFlakes = Array.from({ length: 90 }, (_, id) => {
  const size = 2 + (id % 5);
  const duration = 8 + (id % 9) * 1.2;
  const drift = ((id % 7) - 3) * 14;

  return {
    id,
    left: `${(id * 37) % 101}%`,
    size,
    opacity: 0.38 + (id % 6) * 0.09,
    delay: `-${(id % 17) * 0.7}s`,
    duration: `${duration}s`,
    drift: `${drift}px`,
    endDrift: `${drift * -0.7}px`,
    blur: id % 4 === 0 ? "blur-[1px]" : "",
  };
});

const snowGusts = [
  { id: 1, top: "18%", delay: "-2s", duration: "14s", opacity: 0.16 },
  { id: 2, top: "42%", delay: "-7s", duration: "18s", opacity: 0.12 },
  { id: 3, top: "68%", delay: "-11s", duration: "16s", opacity: 0.14 },
];

function SnowWeather() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#8fa6b8] via-[#b9c8d1] to-[#eef2f1]" />
      <div className="absolute inset-0 bg-[#dce8ef]/24 backdrop-blur-[1.5px]" />
      <div className="absolute left-[28%] top-[9%] h-[280px] w-[520px] -translate-x-1/2 rounded-full bg-white/22 blur-3xl" />
      <div className="absolute right-[-10%] top-[18%] h-[340px] w-[420px] rounded-full bg-[#edf7ff]/20 blur-3xl" />

      {snowGusts.map((gust) => (
        <div
          key={gust.id}
          className="absolute left-[-18%] h-[90px] w-[70%] animate-snow-gust rounded-full bg-white/20 blur-2xl"
          style={{
            top: gust.top,
            opacity: gust.opacity,
            animationDelay: gust.delay,
            animationDuration: gust.duration,
          }}
        />
      ))}

      {snowFlakes.map((flake) => (
        <div
          key={flake.id}
          className={`absolute top-[-10%] animate-snow-fall rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.52)] ${flake.blur}`}
          style={{
            left: flake.left,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            "--snow-drift": flake.drift,
            "--snow-end-drift": flake.endDrift,
          } as CSSProperties}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-white/30 via-white/10 to-transparent" />
      <div className="absolute inset-0 bg-[#f8fbff]/10" />

      <style>{`
        @keyframes snowFall {
          0% {
            transform: translate3d(0, -8%, 0);
            opacity: 0;
          }

          12% {
            opacity: 1;
          }

          52% {
            transform: translate3d(var(--snow-drift), 54vh, 0);
          }

          100% {
            transform: translate3d(var(--snow-end-drift), 116vh, 0);
            opacity: 0;
          }
        }

        @keyframes snowGust {
          0% {
            transform: translateX(-18%) skewX(-10deg);
            opacity: 0;
          }

          28% {
            opacity: 1;
          }

          100% {
            transform: translateX(150%) skewX(-10deg);
            opacity: 0;
          }
        }

        .animate-snow-fall {
          animation: snowFall linear infinite;
          will-change: transform, opacity;
        }

        .animate-snow-gust {
          animation: snowGust ease-in-out infinite;
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

export default SnowWeather;
