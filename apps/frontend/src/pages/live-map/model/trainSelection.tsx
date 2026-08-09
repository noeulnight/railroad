import {
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Train } from "@/entities/train/model/types";
import { TrainSelectionContext } from "@/pages/live-map/model/trainSelectionContext";
import { normalizeTrainType } from "@/shared/lib/utils";

export function TrainSelectionProvider(props: PropsWithChildren) {
  const [manualSelectedTrain, setManualSelectedTrain] =
    useState<Pick<Train, "id" | "type">>();
  const [isManuallyFollowingTrain, setIsManuallyFollowingTrain] =
    useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const urlTrainSelection = useMemo(() => {
    if (location.pathname !== "/map") {
      return undefined;
    }

    const searchParams = new URLSearchParams(location.search);
    const type = normalizeTrainType(searchParams.get("type"));
    const id = searchParams.get("id")?.trim();

    return type && id ? { type, id } : undefined;
  }, [location.pathname, location.search]);
  const selectedTrainId =
    urlTrainSelection?.id ??
    (urlTrainSelection ? undefined : manualSelectedTrain?.id);
  const selectedTrainType =
    urlTrainSelection?.type ??
    (urlTrainSelection
      ? undefined
      : normalizeTrainType(manualSelectedTrain?.type));
  const selectedStationName =
    location.pathname === "/map" && !selectedTrainId
      ? new URLSearchParams(location.search).get("station")?.trim() || undefined
      : undefined;
  const isFollowingTrain =
    urlTrainSelection !== undefined ? true : isManuallyFollowingTrain;

  const updateTrainSearchParams = useCallback(
    (train?: Pick<Train, "id" | "type">) => {
      const nextParams = new URLSearchParams(location.search);

      if (!train) {
        nextParams.delete("type");
        nextParams.delete("id");
      } else {
        nextParams.delete("station");
        nextParams.set("type", normalizeTrainType(train.type) ?? train.type);
        nextParams.set("id", train.id);
      }

      const search = nextParams.toString();

      navigate(
        {
          pathname: train ? "/map" : location.pathname,
          search: search ? `?${search}` : "",
          hash: location.hash,
        },
        { replace: true },
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const selectTrain = useCallback(
    (train: Pick<Train, "id" | "type">, follow = true) => {
      setManualSelectedTrain(train);
      setIsManuallyFollowingTrain(follow);
      updateTrainSearchParams(train);
    },
    [updateTrainSearchParams],
  );

  const clearSelectedTrain = useCallback(() => {
    setManualSelectedTrain(undefined);
    setIsManuallyFollowingTrain(false);
    updateTrainSearchParams(undefined);
  }, [updateTrainSearchParams]);

  const selectStation = useCallback(
    (stationName: string) => {
      setManualSelectedTrain(undefined);
      setIsManuallyFollowingTrain(false);
      const nextParams = new URLSearchParams(location.search);

      nextParams.delete("type");
      nextParams.delete("id");
      if (selectedStationName === stationName) {
        nextParams.delete("station");
      } else {
        nextParams.set("station", stationName);
      }

      const search = nextParams.toString();
      navigate({ pathname: "/map", search: search ? `?${search}` : "" }, {
        replace: true,
      });
    },
    [location.search, navigate, selectedStationName],
  );

  const clearSelectedStation = useCallback(() => {
    const nextParams = new URLSearchParams(location.search);
    nextParams.delete("station");
    const search = nextParams.toString();

    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, {
      replace: true,
    });
  }, [location.pathname, location.search, navigate]);

  return (
    <TrainSelectionContext.Provider
      value={{
        selectedTrainId,
        selectedTrainType,
        selectedStationName,
        isFollowingTrain,
        selectTrain,
        selectStation,
        clearSelectedTrain,
        clearSelectedStation,
      }}
    >
      {props.children}
    </TrainSelectionContext.Provider>
  );
}
