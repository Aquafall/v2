import type { KernelConfig } from "$ts/types/kernel";

export let config: KernelConfig = {
    name:"h20",
    version:"0.1.0",
    debug: true,
    env: {
        OS_DEBUG: "true",
        H2O_DEBUG: "true",
    }
}