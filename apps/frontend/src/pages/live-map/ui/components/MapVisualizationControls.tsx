import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  Layers3,
  TrainFront,
} from "lucide-react";
import type { DashboardData } from "@/entities/train/model/types";
import type { TrainVisualizationMode } from "@/pages/live-map/model/trainVisualization";
import { getTrainVisualizationColor } from "@/pages/live-map/model/trainVisualization";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

const MODES = [
  {
    id: "type",
    label: "열차 종류",
    description: "열차 종류별 고유 색상",
    icon: TrainFront,
  },
  {
    id: "delay",
    label: "지연 현황",
    description: "지연 시간에 따른 색상",
    icon: Clock3,
  },
  {
    id: "speed",
    label: "운행 속도",
    description: "추정 속도에 따른 색상",
    icon: Gauge,
  },
] as const;

const DELAY_LEGEND = [
  { label: "정상", color: "#16a34a" },
  { label: "1~4분", color: "#eab308" },
  { label: "5~9분", color: "#f97316" },
  { label: "10분+", color: "#dc2626" },
];

const SPEED_LEGEND = [
  { label: "정차/미확인", color: "#64748b" },
  { label: "80 미만", color: "#0ea5e9" },
  { label: "80~179", color: "#2563eb" },
  { label: "180+ km/h", color: "#7c3aed" },
];

export function MapVisualizationControls(props: {
  mode: TrainVisualizationMode;
  trains: DashboardData["trains"];
  hasDetailPanel: boolean;
  onModeChange: (mode: TrainVisualizationMode) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMode = MODES.find((item) => item.id === props.mode) ?? MODES[0];
  const legend = useMemo(() => {
    if (props.mode === "delay") return DELAY_LEGEND;
    if (props.mode === "speed") return SPEED_LEGEND;

    return Array.from(
      new Map(
        props.trains.map((train) => [
          train.type,
          {
            label: train.type,
            color: getTrainVisualizationColor(train, "type"),
          },
        ]),
      ).values(),
    );
  }, [props.mode, props.trains]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute top-4 right-4 z-1000 flex flex-col items-end transition-[right]",
        props.hasDetailPanel && "md:right-[21.75rem]",
      )}
    >
      <Button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="pointer-events-auto h-10 gap-2 rounded-lg border-border/70 bg-card/90 px-3 text-card-foreground shadow-lg backdrop-blur-md hover:bg-card"
        onClick={() => setIsOpen((current) => !current)}
        variant="outline"
      >
        <Layers3 className="size-4" />
        <span className="hidden text-xs font-semibold sm:inline">
          {activeMode.label}
        </span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="지도 표시 기준"
          className="pointer-events-auto mt-2 w-64 overflow-hidden rounded-xl border border-border/70 bg-card/95 p-1.5 text-card-foreground shadow-xl backdrop-blur-md"
        >
          <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-muted-foreground">
            지도 표시 기준
          </div>

          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={props.mode === item.id}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-accent",
                props.mode === item.id && "bg-accent",
              )}
              onClick={() => {
                props.onModeChange(item.id);
                setIsOpen(false);
              }}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-foreground shadow-sm">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{item.label}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {item.description}
                </span>
              </span>
              {props.mode === item.id ? (
                <Check className="size-4 text-primary" />
              ) : null}
            </button>
          ))}

          <div className="mx-2 mt-1 border-t border-border/70 pt-2 pb-1">
            <div className="flex max-h-20 flex-wrap gap-x-3 gap-y-1.5 overflow-y-auto text-[10px] text-muted-foreground">
              {legend.map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1 whitespace-nowrap"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
