// Handles all bug reporting stuff
// kernel/modules/bugrep/main.ts

import { KMod } from "../../../types/kmod";
import { H2OKernel } from "../../../kernel/h2o";
import { KMods } from "../../../stores/kernelmods";
import { log, error } from "../../../logging/main";

// Import all BugReporting-related services and processes here
import { AquafallRenderer } from "../../../renderer/main";
import { WindowStore } from "../../../../ts/stores/windows";

export class BugRepKMod extends KMod {
    kernel: H2OKernel;
    name: string;
    renderer: AquafallRenderer;
    windowstore: WindowStore;

    constructor(kernel: H2OKernel) {
        super();
        this.kernel = kernel;
        this.name = "BugReportingModule";
        this.renderer = new AquafallRenderer();
        this.windowstore = new WindowStore();
    }

    init = async () => {
       log("[BugRepKMod]", "Bug reporting module initialized");
       this.renderer.init(this.kernel);
    }

    shutdown = async () => {
        log("[BugRepKMod]", "Bug reporting module shutting down");
    }
}