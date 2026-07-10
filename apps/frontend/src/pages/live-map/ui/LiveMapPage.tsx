import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer } from "react-leaflet";
import { useTheme } from "@/app/model/themeContext";
import { useTrainDashboard } from "@/entities/train/model/trainDashboardContext";
import { useTrainSelection } from "@/pages/live-map/model/trainSelectionContext";
import { StaticMapLayers } from "@/pages/live-map/ui/components/StaticMapLayers";
import { TrainMarkersLayer } from "@/pages/live-map/ui/components/TrainMarkersLayer";
import { TrainPopup } from "@/pages/live-map/ui/components/TrainPopup";

const INITIAL_POSITION: [number, number] = [36.17, 127.83];
const MAP_BOUNDS = L.latLngBounds([32.5, 123.5], [39.0, 132.0]);

export function LiveMapPage() {
  const theme = useTheme();
  const data = useTrainDashboard();
  const {
    selectedTrainId,
    isFollowingTrain,
    selectTrain,
    clearSelectedTrain,
  } = useTrainSelection();
  const selectedTrain = data.trains.find(
    (train) => train.id === selectedTrainId,
  );
  const selectedTrainPosition = selectedTrain
    ? ([selectedTrain.geometry.latitude, selectedTrain.geometry.longitude] as [
      number,
      number,
    ])
    : undefined;

  return (
    <div className="relative h-dvh w-full overflow-hidden md:h-screen">
      {selectedTrain ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1050] flex justify-center px-2 md:absolute md:inset-y-0 md:right-0 md:left-auto md:items-stretch md:justify-end md:p-0 md:py-4 md:pr-4">
          <div className="pointer-events-auto relative flex h-[82dvh] w-full max-w-lg flex-col md:h-full md:w-80 md:max-w-96">
            <div className="h-full w-full overflow-hidden rounded-t-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg md:rounded-lg md:shadow-sm">
              <div className="h-full">
                <TrainPopup
                  key={`${selectedTrain.id}-${selectedTrain.departure.date}`}
                  train={selectedTrain}
                  onClose={clearSelectedTrain}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <MapContainer
        center={INITIAL_POSITION}
        zoom={data.zoomLevel}
        zoomAnimation
        markerZoomAnimation
        fadeAnimation
        zoomAnimationThreshold={8}
        scrollWheelZoom
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-full w-full"
      >
        <StaticMapLayers
          theme={theme}
          onZoomChange={data.setZoomLevel}
          onUserMoveStart={selectedTrain ? clearSelectedTrain : undefined}
          followPosition={isFollowingTrain ? selectedTrainPosition : undefined}
          focusKey={selectedTrain?.id}
          focusZoom={selectedTrain ? Math.max(data.zoomLevel, 15) : undefined}
        />
        <TrainMarkersLayer
          trains={data.trains}
          zoomLevel={data.zoomLevel}
          selectedTrainId={selectedTrainId}
          onTrainToggle={selectTrain}
          onTrainClear={clearSelectedTrain}
        />
      </MapContainer>
    </div>
  );
}
