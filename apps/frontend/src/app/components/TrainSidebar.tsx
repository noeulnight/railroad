import { memo, useMemo } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Clock } from "lucide-react";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/shared/ui/sidebar";
import {
  cn,
  formatDateTime,
  formatDelay,
  formatTrainRoute,
  getTrainImageSrc,
  getTrainRouteStations,
} from "@/shared/lib/utils";
import { useTrainDashboard } from "@/entities/train/model/trainDashboardContext";
import type { Train } from "@/entities/train/model/types";
import { useTrainSelection } from "@/pages/live-map/model/trainSelectionContext";
import { useTrainFilter } from "@/pages/live-map/model/trainFilterContext";
import { matchesTrainFilters } from "@/pages/live-map/model/trainVisualization";
import { TrainSidebarFilters } from "@/app/components/TrainSidebarFilters";

export function TrainSidebar() {
  const data = useTrainDashboard();
  const { filters } = useTrainFilter();
  const { selectedTrainId, selectTrain } = useTrainSelection();
  const sortedTrains = useMemo(
    () =>
      data.trains.filter((train) => matchesTrainFilters(train, filters)).sort((a, b) => {
        const typeOrder = a.type.localeCompare(b.type, "ko-KR", {
          numeric: true,
        });

        if (typeOrder !== 0) {
          return typeOrder;
        }

        return a.id.localeCompare(b.id, "ko-KR", { numeric: true });
      }),
    [data.trains, filters],
  );

  return (
    <>
      <SidebarHeader className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:p-2">
        <div className="relative flex min-h-8 items-center justify-center">
          <span className="block truncate px-10 text-center font-space-grotesk text-lg font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            RAILROAD
          </span>
          <SidebarTrigger
            className="absolute right-0 hidden size-8 md:inline-flex group-data-[collapsible=icon]:static"
            title="열차 목록 접기/펼치기"
          />
        </div>
        <div className="group-data-[collapsible=icon]:hidden">
          <TrainSidebarFilters
            trains={data.trains}
            visibleTrainCount={sortedTrains.length}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {sortedTrains.length === 0 ? (
              <div className="mx-1 rounded-md bg-sidebar-accent px-3 py-6 text-center text-xs text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
                {data.connectionState === "connecting"
                  ? "열차 정보를 불러오는 중입니다."
                  : data.trains.length > 0
                    ? "필터 조건에 맞는 열차가 없습니다."
                    : "운행중인 열차가 없습니다."}
              </div>
            ) : (
              <SidebarMenu>
                {sortedTrains.map((train) => (
                  <TrainSidebarItem
                    key={train.id}
                    train={train}
                    isActive={train.id === selectedTrainId}
                    onSelect={selectTrain}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 text-xs text-sidebar-foreground/65 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center gap-1">
          <Clock className="size-3" />
          <span>갱신 {formatDateTime(data.lastPolledAt)}</span>
        </div>
      </SidebarFooter>
    </>
  );
}

const TrainSidebarItem = memo(function TrainSidebarItem(props: {
  train: Train;
  isActive: boolean;
  onSelect: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
}) {
  const { train, isActive, onSelect } = props;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="h-auto min-h-12 items-start gap-2 py-2 group-data-[collapsible=icon]:items-center"
        isActive={isActive}
        onClick={() => onSelect(train)}
        closeOnMobile
        size="lg"
        tooltip={`${train.type}#${train.id}`}
        type="button"
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-tl-sm"
        >
          <img
            alt=""
            className="h-full w-full object-contain transform -scale-x-100"
            src={getTrainImageSrc(train.type)}
          />
        </span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate font-semibold">
              {train.type}#{train.id}
            </span>
            <span
              className={cn("shrink-0 text-[11px] font-semibold", {
                "text-red-500": train.delay > 0,
                "text-sidebar-foreground/60": train.delay <= 0,
              })}
            >
              {formatDelay(train.delay)}
            </span>
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-sidebar-foreground/60">
            {train.direction === "UP" ? (
              <ArrowUp className="size-3 shrink-0 text-blue-600" />
            ) : (
              <ArrowDown className="size-3 shrink-0 text-red-600" />
            )}
            <TrainRouteLabel train={train} />
          </span>
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
});

function TrainRouteLabel(props: { train: Train }) {
  const { current, next } = getTrainRouteStations(props.train);

  if (current && next) {
    return (
      <span className="flex items-center gap-1">
        {current}
        <ArrowRight className="size-3 shrink-0" />
        {next}
      </span>
    );
  }

  return <span className="truncate">{formatTrainRoute(props.train)}</span>;
}
