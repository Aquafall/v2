// Handles all user-related services and processes
// kernel/modules/user/main.ts

import { KMod } from "../../../types/kmod";
import { H2OKernel } from "../../../kernel/h2o";
import { KMods } from "../../../stores/kernelmods";
import { log, error } from "../../../logging/main";

// Import all User-related services and processes here
import { AquafallRenderer } from "../../../renderer/main";

export class UserKMod extends KMod {
    kernel: H2OKernel;
    name: string;
    renderer: AquafallRenderer;
    constructor(kernel: H2OKernel) {
        super();
        this.kernel = kernel;
        this.name = "UserInterfaceModule";
        this.renderer = new AquafallRenderer();
    }

    init = async () => {
       log("[UserKMod]", "User module initialized");
       this.renderer.init(this.kernel);
    }

    shutdown = async () => {
        log("[UserKMod]", "User module shutting down");
    }
}