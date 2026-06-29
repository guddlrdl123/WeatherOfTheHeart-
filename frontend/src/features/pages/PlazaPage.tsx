import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { completeBackendPlaza, createBackendPlazaEntry, createBackendPlazaWithFirstEntry, deleteBackendPlaza, deleteBackendPlazaEntry, fetchPlazas, reportBackendPlazaEntry, toggleBackendPlazaEntryLike, updateBackendPlazaEntry, updateBackendPlazaEntryPosition } from "../../services/plazaService";
import type { Plaza } from "../../types/plaza";
import type { RoomObjectPosition } from "../../types/roomObject";
import { getCurrentUserId, getCurrentUserIsAdmin } from "../../utils/authSession";
import { PlazaListPage } from "../plaza/PlazaListPage";
import { PlazaRoomPage } from "../plaza/PlazaRoomPage";
import type { PlazaWriteValue } from "../plaza/PlazaWriteModal";
import { canCreatePlazaToday, normalizePlaza } from "../plaza/plazaHelpers";

const PLAZA_DELETE_NOTICE = "광장이 삭제되었습니다.";

function createDraftPlazaId() {
  return `draft-plaza-${crypto.randomUUID()}`;
}

function PlazaPage() {
  const { plazaId } = useParams();
  const navigate = useNavigate();
  const currentUserId = useMemo(() => getCurrentUserId(), []);
  const currentUserIsAdmin = useMemo(() => getCurrentUserIsAdmin(), []);
  const [plazas, setPlazas] = useState<Plaza[]>([]);
  const [draftPlaza, setDraftPlaza] = useState<Plaza | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [topNotice, setTopNotice] = useState<string | null>(null);
  const isFinalizingDraftRef = useRef(false);
  const topNoticeTimerRef = useRef<number | null>(null);

  const normalizedPlazas = useMemo(() => plazas.map(normalizePlaza), [plazas]);
  const selectedSavedPlaza = plazaId ? normalizedPlazas.find((plaza) => plaza.id === plazaId) ?? null : null;
  const selectedDraftPlaza = plazaId && draftPlaza?.id === plazaId ? draftPlaza : null;
  const selectedPlaza = selectedSavedPlaza ?? selectedDraftPlaza;
  const isDraftPlaza = Boolean(selectedDraftPlaza && !selectedSavedPlaza);

  const loadPlazaList = useCallback(async (options: { shouldIgnore?: () => boolean } = {}) => {
    const shouldIgnore = options.shouldIgnore ?? (() => false);

    try {
      setIsLoading(true);
      setMessage("");

      const data = await fetchPlazas();

      if (!shouldIgnore()) {
        setPlazas(data.map(normalizePlaza));
      }
    } catch (caughtError) {
      if (!shouldIgnore()) {
        setMessage(caughtError instanceof Error ? caughtError.message : "광장을 불러오지 못했습니다.");
      }
    } finally {
      if (!shouldIgnore()) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!plazaId?.startsWith("draft-plaza-")) {
      isFinalizingDraftRef.current = false;
      return;
    }

    if (!draftPlaza && !isFinalizingDraftRef.current) {
      navigate("/plaza", { replace: true });
    }
  }, [draftPlaza, navigate, plazaId]);

  useEffect(() => {
    let ignore = false;
    const loadTimerId = window.setTimeout(() => {
      void loadPlazaList({ shouldIgnore: () => ignore });
    }, 0);

    return () => {
      ignore = true;
      window.clearTimeout(loadTimerId);
    };
  }, [loadPlazaList]);

  useEffect(() => {
    return () => {
      if (topNoticeTimerRef.current !== null) {
        window.clearTimeout(topNoticeTimerRef.current);
      }
    };
  }, []);

  function showTopNotice(nextNotice: string) {
    setTopNotice(nextNotice);

    if (topNoticeTimerRef.current !== null) {
      window.clearTimeout(topNoticeTimerRef.current);
    }

    topNoticeTimerRef.current = window.setTimeout(() => {
      setTopNotice(null);
      topNoticeTimerRef.current = null;
    }, 3500);
  }

  function persistPlazas(updater: (current: Plaza[]) => Plaza[]) {
    setPlazas((current) => {
      const nextPlazas = updater(current).map(normalizePlaza);
      return nextPlazas;
    });
  }

  function handleCreatePlaza(plaza: Plaza) {
    if (!canCreatePlazaToday(normalizedPlazas, currentUserId, currentUserIsAdmin)) {
      return;
    }

    // 생성 설정만 입력한 단계에서는 서버나 목록에 저장하지 않고 임시 광장으로만 입장시킵니다.
    const nextDraftPlaza = normalizePlaza({
      ...plaza,
      id: createDraftPlazaId(),
      ownerId: currentUserId,
      entries: [],
      entryCount: 0,
      status: "open",
      createdAt: new Date().toISOString(),
      endedAt: undefined,
    });

    setMessage("");
    setDraftPlaza(nextDraftPlaza);
    navigate(`/plaza/${nextDraftPlaza.id}`);
  }

  function handleUpdateDraftPlaza(updater: (plaza: Plaza) => Plaza) {
    setDraftPlaza((current) => current ? normalizePlaza(updater(current)) : current);
  }

  async function handleFinalizeDraftPlaza(
    value: PlazaWriteValue,
    position: RoomObjectPosition,
    layer: number,
  ) {
    if (!draftPlaza) {
      return;
    }

    try {
      isFinalizingDraftRef.current = true;
      setMessage("");
      const completedPlaza = normalizePlaza(await createBackendPlazaWithFirstEntry(
        draftPlaza,
        value,
        position,
        layer,
      ));

      persistPlazas((current) => [completedPlaza, ...current]);
      navigate(`/plaza/${completedPlaza.id}`, { replace: true });
      setDraftPlaza(null);
    } catch (caughtError) {
      isFinalizingDraftRef.current = false;
      const errorMessage = caughtError instanceof Error ? caughtError.message : "첫 글과 함께 광장을 생성하지 못했습니다.";
      setMessage(errorMessage);
      throw new Error(errorMessage, { cause: caughtError });
    }
  }

  function handleCancelDraftPlaza() {
    setDraftPlaza(null);
    navigate("/plaza", { replace: true });
  }

  async function handleDeletePlaza(plazaId: string) {
    await deleteBackendPlaza(plazaId);
    persistPlazas((current) => current.filter((plaza) => plaza.id !== plazaId));
    navigate("/plaza", { replace: true });
    showTopNotice(PLAZA_DELETE_NOTICE);
  }

  async function handleCompletePlaza(plazaId: string) {
    await completeBackendPlaza(plazaId);
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      {topNotice && (
        <div className="fixed left-1/2 top-6 z-[120] w-[min(420px,calc(100vw-32px))] -translate-x-1/2">
          <div className="mw-surface flex items-start gap-3 rounded-xl bg-[#fffbf6f2] px-4 py-3 text-[#5a4632] shadow-xl backdrop-blur-sm">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#7c9b78]/30 bg-[#edf5e7] text-[#5f875b]">
                <CheckCircle2 size={17} />
              </span>
              <p className="min-w-0 flex-1 text-sm leading-6">{topNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setTopNotice(null)}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[#5a4632]/55 hover:bg-[#5a4632]/10 hover:text-[#5a4632]"
              aria-label="안내 메시지 닫기"
              title="안내 메시지 닫기"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {selectedPlaza ? (
        <PlazaRoomPage
          key={selectedPlaza.id}
          plaza={selectedPlaza}
          currentGuestId={currentUserId}
          currentGuestIsAdmin={currentUserIsAdmin}
          isDraftPlaza={isDraftPlaza}
          isRefreshing={isLoading}
          onUpdatePlaza={(updater) => {
            if (isDraftPlaza) {
              handleUpdateDraftPlaza(updater);
              return;
            }

            persistPlazas((current) => current.map((plaza) => plaza.id === selectedPlaza.id ? updater(plaza) : plaza));
          }}
          onRefresh={
            isDraftPlaza
              ? undefined
              : () => loadPlazaList()
          }
          onFinalizeDraftPlaza={handleFinalizeDraftPlaza}
          onCancelDraftPlaza={handleCancelDraftPlaza}
          onDeletePlaza={() => handleDeletePlaza(selectedPlaza.id)}
          onCompletePlaza={() => handleCompletePlaza(selectedPlaza.id)}
          onCreateEntry={
            isDraftPlaza
              ? undefined
              : (value, position, layer) => createBackendPlazaEntry(selectedPlaza.id, value, position, layer)
          }
          onToggleEntryLike={
            isDraftPlaza
              ? undefined
              : (entryId) => toggleBackendPlazaEntryLike(entryId)
          }
          onUpdateEntry={
            isDraftPlaza
              ? undefined
              : (entryId, value) => updateBackendPlazaEntry(entryId, value)
          }
          onUpdateEntryPosition={
            isDraftPlaza
              ? undefined
              : (entryId, position, layer) => updateBackendPlazaEntryPosition(entryId, position, layer)
          }
          onDeleteEntry={
            isDraftPlaza
              ? undefined
              : (entryId) => deleteBackendPlazaEntry(entryId)
          }
          onReportEntry={
            isDraftPlaza
              ? undefined
              : (entryId, value) => reportBackendPlazaEntry(entryId, value)
          }
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
          <PlazaListPage
            plazas={normalizedPlazas}
            currentGuestId={currentUserId}
            currentGuestIsAdmin={currentUserIsAdmin}
            isRefreshing={isLoading}
            onRefresh={() => loadPlazaList()}
            onCreate={(plaza) => void handleCreatePlaza(plaza)}
          />
        </>
      )}
    </div>
  );
}

export default PlazaPage;
