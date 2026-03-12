"use client";

interface ProbabilityBarProps {
  probHome: number;
  probDraw: number;
  probAway: number;
  homeLabel?: string;
  awayLabel?: string;
}

export default function ProbabilityBar({
  probHome,
  probDraw,
  probAway,
  homeLabel = "H",
  awayLabel = "A",
}: ProbabilityBarProps) {
  const widthH = `${(probHome * 100).toFixed(1)}%`;
  const widthD = `${(probDraw * 100).toFixed(1)}%`;
  const widthA = `${(probAway * 100).toFixed(1)}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: widthH }}
          title={`${homeLabel}: ${widthH}`}
        />
        <div
          className="bg-gray-500 transition-all duration-500"
          style={{ width: widthD }}
          title={`Draw: ${widthD}`}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: widthA }}
          title={`${awayLabel}: ${widthA}`}
        />
      </div>
      <div className="flex justify-between text-[11px] text-gray-400">
        <span className="text-green-400">{homeLabel} {(probHome * 100).toFixed(0)}%</span>
        <span className="text-gray-400">D {(probDraw * 100).toFixed(0)}%</span>
        <span className="text-red-400">{awayLabel} {(probAway * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}
