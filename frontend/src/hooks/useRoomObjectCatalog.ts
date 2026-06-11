import { useEffect, useState } from "react";
import { loadRoomObjectCatalog } from "../constants/roomObjects";

export function useRoomObjectCatalog() {
  const [, setVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    loadRoomObjectCatalog()
      .then(() => {
        if (!ignore) {
          setVersion((version) => version + 1);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setVersion((version) => version + 1);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return { isLoading };
}
