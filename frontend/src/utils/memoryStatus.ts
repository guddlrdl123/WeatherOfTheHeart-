import type { Memory } from "../types/memory";

export function hasMemoryBeenUpdated(memory: Memory) {
    return memory.isUpdated === true;
}
