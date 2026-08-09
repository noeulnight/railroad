import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, type Map as MapInstance } from "maplibre-gl";
import { useTheme } from "@/app/model/themeContext";
import type { Station } from "@/entities/station/model/types";
import type { Train } from "@/entities/train/model/types";
import { useTrainDashboard } from "@/entities/train/model/trainDashboardContext";
import { useTrainSelection } from "@/pages/live-map/model/trainSelectionContext";
import {
  matchesTrainFilters,
  type TrainVisualizationMode,
} from "@/pages/live-map/model/trainVisualization";
import { useTrainFilter } from "@/pages/live-map/model/trainFilterContext";
import { MapVisualizationControls } from "@/pages/live-map/ui/components/MapVisualizationControls";
import { StationMarkersLayer } from "@/pages/live-map/ui/components/StationMarkersLayer";
import { StationPopup } from "@/pages/live-map/ui/components/StationPopup";
import { StaticMapLayers } from "@/pages/live-map/ui/components/StaticMapLayers";
import {
  createMapStyle,
  MIN_MAP_ZOOM,
} from "@/pages/live-map/ui/components/mapStyle";
import { TrainMarkersLayer } from "@/pages/live-map/ui/components/TrainMarkersLayer";
import { TrainPopup } from "@/pages/live-map/ui/components/TrainPopup";
import { TrainTrailLayer } from "@/pages/live-map/ui/components/TrainTrailLayer";
import { getTrainPrimaryColor } from "@/shared/lib/utils";
import { normalizeTrainType } from "@/shared/lib/utils";

const INITIAL_POSITION: [number, number] = [127.83, 36.17];
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [123.5, 32.5],
  [132.0, 39.0],
];

export function LiveMapPage() {
  const theme = useTheme();
  const initialThemeRef = useRef(theme);
  const initialZoomRef = useRef<number | undefined>(undefined);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapInstance>();
  const [visualizationMode, setVisualizationMode] =
    useState<TrainVisualizationMode>("type");
  const { filters } = useTrainFilter();
  const data = useTrainDashboard();
  const {
    selectedTrainId,
    selectedTrainType,
    selectedStationName,
    isFollowingTrain,
    selectTrain,
    selectStation,
    clearSelectedTrain,
    clearSelectedStation,
  } = useTrainSelection();
  const visibleTrains = useMemo(
    () => data.trains.filter((train) => matchesTrainFilters(train, filters)),
    [data.trains, filters],
  );
  const selectedTrain = data.trains.find(
    (train) =>
      train.id === selectedTrainId &&
      (!selectedTrainType ||
        normalizeTrainType(train.type) === selectedTrainType),
  );
  const selectedStation = data.stations.find(
    (station) => station.name === selectedStationName,
  );
  const renderedStations = useMemo(() => {
    if (
      !selectedStation ||
      data.visibleStations.some(
        (station) => station.name === selectedStation.name,
      )
    ) {
      return data.visibleStations;
    }

    return [...data.visibleStations, selectedStation];
  }, [data.visibleStations, selectedStation]);
  const selectedTrainPosition = selectedTrain
    ? ([selectedTrain.geometry.longitude, selectedTrain.geometry.latitude] as [
        number,
        number,
      ])
    : undefined;
  const selectedTrainHistory = selectedTrainId
    ? (data.trainPositionHistory[selectedTrainId] ?? [])
    : [];
  const handleTrainToggle = useCallback(
    (train: Pick<Train, "id" | "type">, follow = true) => {
      selectTrain(train, follow);
    },
    [selectTrain],
  );
  const handleStationToggle = useCallback(
    (station: Station) => {
      selectStation(station.name);
    },
    [selectStation],
  );
  const clearMapSelection = useCallback(() => {
    if (selectedTrain) {
      clearSelectedTrain();
    } else {
      clearSelectedStation();
    }
  }, [clearSelectedStation, clearSelectedTrain, selectedTrain]);

  initialZoomRef.current ??= data.zoomLevel;

  useEffect(() => {
    if (!mapContainerRef.current) {
      return;
    }

    const mapInstance = new MapLibreMap({
      container: mapContainerRef.current,
      style: createMapStyle(initialThemeRef.current),
      center: INITIAL_POSITION,
      zoom: initialZoomRef.current,
      minZoom: MIN_MAP_ZOOM,
      maxZoom: 20,
      maxBounds: MAP_BOUNDS,
      renderWorldCopies: false,
    });

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden md:h-screen">
      <MapVisualizationControls
        mode={visualizationMode}
        trains={data.trains}
        hasDetailPanel={selectedTrain !== undefined || selectedStation !== undefined}
        onModeChange={setVisualizationMode}
      />

      {selectedTrain || selectedStation ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1050] flex justify-center px-2 md:absolute md:inset-y-0 md:right-0 md:left-auto md:items-stretch md:justify-end md:p-2">
          <div className="pointer-events-auto relative flex h-[82dvh] w-full max-w-lg flex-col md:h-full md:w-80 md:max-w-96">
            <div className="h-full w-full overflow-hidden rounded-t-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:rounded-lg md:shadow-sm">
              <div className="h-full">
                {selectedTrain ? (
                  <TrainPopup
                    key={`${selectedTrain.id}-${selectedTrain.departure.date}`}
                    train={selectedTrain}
                    onClose={clearSelectedTrain}
                  />
                ) : selectedStation ? (
                  <StationPopup
                    station={selectedStation}
                    trains={data.trains}
                    onClose={clearSelectedStation}
                    onTrainSelect={(train) => handleTrainToggle(train)}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={mapContainerRef} className="h-full w-full" />

      {map ? (
        <>
          <StaticMapLayers
            map={map}
            theme={theme}
            onZoomChange={data.setZoomLevel}
            onUserMoveStart={
              selectedTrain || selectedStation ? clearMapSelection : undefined
            }
            followPosition={
              isFollowingTrain
                ? selectedTrainPosition
                : selectedStation?.geometry
                  ? [
                      selectedStation.geometry.longitude,
                      selectedStation.geometry.latitude,
                    ]
                  : undefined
            }
            focusKey={
              selectedTrain?.id ??
              (selectedStation ? `station:${selectedStation.name}` : undefined)
            }
            focusZoom={
              selectedTrain
                ? Math.max(data.zoomLevel, 15)
                : selectedStation
                  ? Math.max(data.zoomLevel, 12)
                  : undefined
            }
          />
          <StationMarkersLayer
            map={map}
            stations={renderedStations}
            selectedStationName={selectedStationName}
            onStationToggle={handleStationToggle}
          />
          <TrainMarkersLayer
            map={map}
            trains={visibleTrains}
            theme={theme}
            visualizationMode={visualizationMode}
            selectedTrainId={selectedTrainId}
            onTrainToggle={handleTrainToggle}
            onTrainClear={clearSelectedTrain}
          />
          {selectedTrain ? (
            <TrainTrailLayer
              map={map}
              positions={selectedTrainHistory}
              color={getTrainPrimaryColor(selectedTrain.type)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
