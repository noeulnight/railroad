import { useMemo, useState } from "react";
import { ChevronDown, Clock3, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { DashboardData } from "@/entities/train/model/types";
import { useTrainFilter } from "@/pages/live-map/model/trainFilterContext";
import type { TrainFilters } from "@/pages/live-map/model/trainVisualization";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

export function TrainSidebarFilters(props: {
  trains: DashboardData["trains"];
  visibleTrainCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilters } = useTrainFilter();
  const trainTypes = useMemo(
    () => Array.from(new Set(props.trains.map((train) => train.type))).sort(),
    [props.trains],
  );
  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.direction !== "all" ||
    filters.delayedOnly;

  return (
    <div className="mt-2">
      <Button
        type="button"
        aria-expanded={isOpen}
        className="w-full justify-start border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-none hover:bg-sidebar-accent/80"
        onClick={() => setIsOpen((current) => !current)}
        size="sm"
        variant="outline"
      >
        <SlidersHorizontal className="size-3.5" />
        <span className="flex-1 text-left">열차 필터</span>
        <span className="text-[10px] text-sidebar-foreground/60">
          {props.visibleTrainCount}/{props.trains.length}
        </span>
        {hasActiveFilters ? (
          <span className="size-2 rounded-full bg-sidebar-primary" />
        ) : null}
        <ChevronDown
          className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
        />
      </Button>

      {isOpen ? (
        <div className="mt-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/60 p-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-sidebar-foreground/60">
              열차 종류
            </span>
            {hasActiveFilters ? (
              <Button
                type="button"
                className="h-6 gap-1 px-1.5 text-[10px] text-sidebar-foreground/60"
                onClick={() =>
                  setFilters({
                    types: [],
                    direction: "all",
                    delayedOnly: false,
                  })
                }
                size="xs"
                variant="ghost"
              >
                <RotateCcw className="size-3" />
                초기화
              </Button>
            ) : null}
          </div>

          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
            {trainTypes.map((type) => {
              const isSelected = filters.types.includes(type);

              return (
                <Button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  className="border-sidebar-border px-2"
                  onClick={() =>
                    setFilters({
                      ...filters,
                      types: isSelected
                        ? filters.types.filter(
                            (selectedType) => selectedType !== type,
                          )
                        : [...filters.types, type],
                    })
                  }
                  size="xs"
                  variant={isSelected ? "secondary" : "outline"}
                >
                  {type}
                </Button>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {[
              ["all", "전체"],
              ["UP", "상행"],
              ["DOWN", "하행"],
            ].map(([direction, label]) => (
              <Button
                key={direction}
                type="button"
                aria-pressed={filters.direction === direction}
                className="border-sidebar-border"
                onClick={() =>
                  setFilters({
                    ...filters,
                    direction: direction as TrainFilters["direction"],
                  })
                }
                size="xs"
                variant={filters.direction === direction ? "secondary" : "outline"}
              >
                {label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            aria-pressed={filters.delayedOnly}
            className="mt-1.5 w-full justify-start gap-2 border-sidebar-border"
            onClick={() =>
              setFilters({ ...filters, delayedOnly: !filters.delayedOnly })
            }
            size="sm"
            variant={filters.delayedOnly ? "secondary" : "outline"}
          >
            <Clock3 className="size-3.5" />
            지연 열차만 표시
          </Button>
        </div>
      ) : null}
    </div>
  );
}
