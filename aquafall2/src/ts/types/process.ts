import type { Service } from "./service";
import type { ProcessInfo } from "./processInfo";

export interface Process extends ProcessInfo {
    kill: () => boolean;
}