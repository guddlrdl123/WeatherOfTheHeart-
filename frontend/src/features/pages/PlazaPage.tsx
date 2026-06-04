import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import type { Plaza } from "../../types/plaza";
import { getGuestId, loadPlazas, savePlazas } from "../../utils/plazaStorage";
import { PlazaListPage } from "../plaza/PlazaListPage";
import { PlazaRoomPage } from "../plaza/PlazaRoomPage";
import { canCreatePlazaToday, normalizePlaza } from "../plaza/plazaHelpers";

function PlazaPage() {
  const { plazaId } = useParams();
  const navigate = useNavigate();
  const currentGuestId = useMemo(() => getGuestId(), []);
  const [plazas, setPlazas] = useState<Plaza[]>(() => loadPlazas());
  const [draftPlaza, setDraftPlaza] = useState<Plaza | null>(null);

  const normalizedPlazas = useMemo(() => plazas.map(normalizePlaza), [plazas]);
  const selectedSavedPlaza = plazaId ? normalizedPlazas.find((plaza) => plaza.id === plazaId) ?? null : null;
  const selectedDraftPlaza = plazaId && draftPlaza?.id === plazaId ? draftPlaza : null;
  const selectedPlaza = selectedSavedPlaza ?? selectedDraftPlaza;
  const isDraftPlaza = Boolean(selectedDraftPlaza && !selectedSavedPlaza);

  function persistPlazas(updater: (current: Plaza[]) => Plaza[]) {
    setPlazas((current) => {
      const nextPlazas = updater(current).map(normalizePlaza);
      savePlazas(nextPlazas);
      return nextPlazas;
    });
  }

  function handleCreatePlaza(plaza: Plaza) {
    if (!canCreatePlazaToday(normalizedPlazas, currentGuestId)) {
      return;
    }

    // 첫 글과 오브젝트 위치가 확정되기 전까지는 빈 광장을 저장소에 쓰지 않습니다.
    setDraftPlaza(plaza);
    navigate(`/plaza/${plaza.id}`);
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
          currentGuestId={currentGuestId}
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
        />
      ) : plazaId ? (
        <main className="grid min-h-[calc(100vh-64px)] place-items-center px-6 text-sm text-[#5a4632]/60">
          광장을 찾을 수 없습니다.
        </main>
      ) : (
        <PlazaListPage plazas={normalizedPlazas} currentGuestId={currentGuestId} onCreate={handleCreatePlaza} />
      )}
    </div>
  );
}

export default PlazaPage;
