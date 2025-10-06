// Handles all user-related services and processes
// kernel/modules/user/main.ts

import type { KMod } from "../../../types/kmod";
import { H2OKernel } from "../../../kernel/h2o";
import { KMods } from "../../../stores/kernelmods";
import { log, error } from "../../../logging/main";

export class UserKMod implements KMod {
    kernel: H2OKernel;
    name: string;
    constructor(kernel: H2OKernel) {
        this.kernel = kernel;
        this.name = "UserInterfaceModule";
    }

    async init() {
       log("[UserKMod]", "User module initialized");
    }

    async shutdown() {
        log("[UserKMod]", "User module shutting down");
    }
}