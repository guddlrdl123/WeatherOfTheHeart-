import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { createBackendPlaza, createBackendPlazaEntry, fetchPlazas } from "../../services/plazaService";
import type { Plaza } from "../../types/plaza";
import { getCurrentUserId } from "../../utils/authSession";
import { PlazaListPage } from "../plaza/PlazaListPage";
import { PlazaRoomPage } from "../plaza/PlazaRoomPage";
import { canCreatePlazaToday, normalizePlaza } from "../plaza/plazaHelpers";

function PlazaPage() {
  const { plazaId } = useParams();
  const navigate = useNavigate();
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [draftPlaza, setDraftPlaza] = useState<Plaza | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  const normalizedPlazas = useMemo(() => plazas.map(normalizePlaza), [plazas]);
  const selectedSavedPlaza = plazaId ? normalizedPlazas.find((plaza) => plaza.id === plazaId) ?? null : null;
  const selectedDraftPlaza = plazaId && draftPlaza?.id === plazaId ? draftPlaza : null;
  const selectedPlaza = selectedSavedPlaza ?? selectedDraftPlaza;
  const isDraftPlaza = Boolean(selectedDraftPlaza && !selectedSavedPlaza);

  useEffect(() => {
    let ignore = false;

    async function loadPlazas() {
      try {
        setIsLoading(true);
        setMessage("");

        const data = await fetchPlazas();

        if (!ignore) {
          setPlazas(data.map(normalizePlaza));
        }
      } catch (caughtError) {
        if (!ignore) {
          setMessage(caughtError instanceof Error ? caughtError.message : "광장을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadPlazas();

    return () => {
      ignore = true;
    };
  }, []);

  function persistPlazas(updater: (current: Plaza[]) => Plaza[]) {
    setPlazas((current) => {
      const nextPlazas = updater(current).map(normalizePlaza);
      return nextPlazas;
    });
  }

  async function handleCreatePlaza(plaza: Plaza) {
    if (!canCreatePlazaToday(normalizedPlazas, currentUserId)) {
      return;
    }

    try {
      setMessage("");
      const createdPlaza = await createBackendPlaza(currentUserId, plaza);

      persistPlazas((current) => [createdPlaza, ...current]);
      setDraftPlaza(null);
      navigate(`/plaza/${createdPlaza.id}`);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "광장을 생성하지 못했습니다.");
    }
  }

  function handleUpdateDraftPlaza(updater: (plaza: Plaza) => Plaza) {
    setDraftPlaza((current) => current ? normalizePlaza(updater(current)) : current);
  }

  function handleFinalizeDraftPlaza(plaza: Plaza) {
    const completedPlaza = normalizePlaza(plaza);

    persistPlazas((current) => (
      current.some((item) => item.id === completedPlaza.id)
        ? current.map((item) => item.id === completedPlaza.id ? completedPlaza : item)
        : [completedPlaza, ...current]
    ));
    setDraftPlaza(null);
    navigate(`/plaza/${completedPlaza.id}`, { replace: true });
  }

  function handleCancelDraftPlaza() {
    setDraftPlaza(null);
    navigate("/plaza", { replace: true });
  }

  function handleDeletePlaza(plazaId: string) {
    // 방장 삭제는 광장 목록 저장소에서 해당 광장을 제거하고 목록 화면으로 되돌립니다.
    persistPlazas((current) => current.filter((plaza) => plaza.id !== plazaId));
    navigate("/plaza", { replace: true });
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      {selectedPlaza ? (
        <PlazaRoomPage
          key={selectedPlaza.id}
          plaza={selectedPlaza}
          currentGuestId={currentUserId}
          isDraftPlaza={isDraftPlaza}
          onUpdatePlaza={(updater) => {
            if (isDraftPlaza) {
              handleUpdateDraftPlaza(updater);
              return;
            }

            persistPlazas((current) => current.map((plaza) => plaza.id === selectedPlaza.id ? updater(plaza) : plaza));
          }}
          onFinalizeDraftPlaza={handleFinalizeDraftPlaza}
          onCancelDraftPlaza={handleCancelDraftPlaza}
          onDeletePlaza={() => handleDeletePlaza(selectedPlaza.id)}
          onCreateEntry={(value, position, layer) => createBackendPlazaEntry(selectedPlaza.id, currentUserId, value, position, layer)}
        />
      ) : plazaId ? (
        <main className="grid min-h-[calc(100vh-64px)] place-items-center px-6 text-sm text-[#5a4632]/60">
          {isLoading ? "광장을 불러오는 중입니다." : message || "광장을 찾을 수 없습니다."}
        </main>
      ) : (
        <>
          {message && (
            <div className="mx-auto mt-4 w-[1460px] rounded-md border border-[#b65f55]/20 bg-[#f4dfd9]/70 px-4 py-3 text-sm text-[#9a4f48]">
              {message}
            </div>
          )}
          <PlazaListPage plazas={normalizedPlazas} currentGuestId={currentUserId} onCreate={(plaza) => void handleCreatePlaza(plaza)} />
        </>
      )}
    </div>
  );
}

export default PlazaPage;
