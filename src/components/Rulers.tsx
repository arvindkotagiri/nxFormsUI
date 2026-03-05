import { useEffect, useState } from "react";

interface Props {
    zoom?: number;
}

export function Rulers({ zoom = 1 }: Props) {

    const paperWidth = 8.5 * 96;  // inches → px
    const paperHeight = 11 * 96;

    const tick = 50 * zoom;

    return (
        <>
            {/* TOP RULER */}
            <div
                className="absolute -top-6 left-0 h-6 bg-white border border-slate-300 z-40"
                style={{
                    width: paperWidth,
                    backgroundSize: `${tick}px 100%`,
                    backgroundImage: `
                        repeating-linear-gradient(
                            to right,
                            transparent 0px,
                            transparent ${tick - 1}px,
                            #cbd5e1 ${tick}px
                        )
                    `
                }}
            >
                {Array.from({ length: Math.ceil(paperWidth / tick) }).map((_, i) => (
                    <span
                        key={i}
                        className="absolute text-[9px] text-slate-400"
                        style={{
                            left: i * tick + 2,
                            top: 2
                        }}
                    >
                        {Math.round(i * 50)}
                    </span>
                ))}
            </div>

            {/* LEFT RULER */}
            <div
                className="absolute -left-6 top-0 w-6 bg-white border border-slate-300 z-40"
                style={{
                    height: paperHeight,
                    backgroundSize: `100% ${tick}px`,
                    backgroundImage: `
                        repeating-linear-gradient(
                            to bottom,
                            transparent 0px,
                            transparent ${tick - 1}px,
                            #cbd5e1 ${tick}px
                        )
                    `
                }}
            >
                {Array.from({ length: Math.ceil(paperHeight / tick) }).map((_, i) => (
                    <span
                        key={i}
                        className="absolute text-[9px] text-slate-400"
                        style={{
                            top: i * tick + 2,
                            left: 2
                        }}
                    >
                        {Math.round(i * 50)}
                    </span>
                ))}
            </div>
        </>
    );
}