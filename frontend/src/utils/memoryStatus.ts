import type { Memory } from "../types/memory";

const UPDATED_THRESHOLD_MS = 60_000;

export function hasMemoryBeenUpdated(memory: Memory) {
    if (memory.isUpdated) {
        return true;
    }

    if (!memory.updatedAt) {
        return false;
    }

    const createdTime = new Date(memory.createdAt).getTime();
    const updatedTime = new Date(memory.updatedAt).getTime();

    if (Number.isNaN(createdTime) || Number.isNaN(updatedTime)) {
        return memory.createdAt !== memory.updatedAt;
    }

    return updatedTime - createdTime > UPDATED_THRESHOLD_MS;
}
