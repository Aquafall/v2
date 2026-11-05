import type { KernelConfig } from "$ts/types/kernel";

export let config: KernelConfig = {
    name:"h2o",
    version:"0.1.0",
    debug: true,
    env: {
        OS_DEBUG: "true",
        H2O_DEBUG: "true",
    }
}