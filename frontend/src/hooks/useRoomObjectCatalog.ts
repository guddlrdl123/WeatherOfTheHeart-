import { useEffect, useState } from "react";
import { loadRoomObjectCatalog } from "../constants/roomObjects";

export function useRoomObjectCatalog() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    let ignore = false;

    loadRoomObjectCatalog()
      .then(() => {
        if (!ignore) {
          setVersion((version) => version + 1);
        }
      })
      .catch(() => {
        if (!ignore) {
          setVersion((version) => version + 1);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);
}
