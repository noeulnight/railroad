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
  const [manualSelectedTrainId, setManualSelectedTrainId] =
    useState<string>();
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
    (urlTrainSelection ? undefined : manualSelectedTrainId);
  const isFollowingTrain =
    urlTrainSelection !== undefined ? true : isManuallyFollowingTrain;

  const updateTrainSearchParams = useCallback(
    (train?: Pick<Train, "id" | "type">) => {
      const nextParams = new URLSearchParams(location.search);

      if (!train) {
        nextParams.delete("type");
        nextParams.delete("id");
      } else {
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
      setManualSelectedTrainId(train.id);
      setIsManuallyFollowingTrain(follow);
      updateTrainSearchParams(train);
    },
    [updateTrainSearchParams],
  );

  const clearSelectedTrain = useCallback(() => {
    setManualSelectedTrainId(undefined);
    setIsManuallyFollowingTrain(false);
    updateTrainSearchParams(undefined);
  }, [updateTrainSearchParams]);

  return (
    <TrainSelectionContext.Provider
      value={{
        selectedTrainId,
        isFollowingTrain,
        selectTrain,
        clearSelectedTrain,
      }}
    >
      {props.children}
    </TrainSelectionContext.Provider>
  );
}
