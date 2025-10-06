import { EventEmitter } from "events";
import type { Service } from "src/ts/types/service";
import type { KernelConfig } from "src/ts/types/kernel";
import { KMods } from "../stores/kernelmods";
import type { KMod } from "../types/kmod";
import { log, error } from "../logging/main";

export class H2OKernel extends EventEmitter {
    private kmods: Record<string, KMod | (new (kernel: H2OKernel) => KMod)> = KMods;
    private started = false;
    public config: KernelConfig;

    constructor(config?: Partial<KernelConfig>) {
        super();
        this.config = {
            name: config?.name ?? "h2o",
            version: config?.version ?? "0.0.1",
            env: config?.env ?? processEnvSafely(),
            debug: config?.debug ?? true,
        };
        this.handleProcessSignals();
    }

    async start(): Promise<void> {
        if (this.started) return;
        log("[KERNEL]", `Starting kernel ${JSON.stringify(this.config)}`);
        this.emit("startup:begin");

        try {
            await this.initServices();
            this.started = true;
            this.emit("startup:done");
            window["kernel"] = this;
            log("[KERNEL]", "Kernel started");
        } catch (err) {
            this.emit("startup:error", err);
            this.handleError(err as Error);
            throw err;
        }
    }

    async stop(): Promise<void> {
        if (!this.started) return;
        log("[KERNEL]", "Shutting down kernel");
        this.emit("shutdown:begin");
        try {
            await this.shutdownServices();
            this.started = false;
            this.emit("shutdown:done");
            log("[KERNEL]", "Kernel stopped");
        } catch (err) {
            this.emit("shutdown:error", err);
            this.handleError(err as Error);
            throw err;
        }
    }

    async restart(): Promise<void> {
        log("[KERNEL]", "Restarting kernel");
        await this.stop();
        await this.start();
    }

    registerService<S extends KMod>(ModClass: new (kernel: H2OKernel) => S): S {
        const service = new ModClass(this);
        if (!service || !service.name) {
            throw new Error("Service must have a name");
        }
        if (this.kmods[service.name]) {
            throw new Error(`Service already registered: ${service.name}`);
        }
        this.kmods[service.name] = service;
        this.emit("kmod:registered", service.name);
        log("[KMOD]", `Service registered: ${service.name}`);
        return service;
    }

    getService<T extends Service = Service>(name: string): T | undefined {
        return this.kmods[name] as T | undefined;
    }

    private async initServices(): Promise<void> {
    for (const [name, ModClass] of Object.entries(this.kmods)) {
        try {
            // Create instance of the module
            const service = new ModClass(this);
            // Store the instance
            this.kmods[name] = service;
            
            if (typeof service.init === "function") {
                log("[KERNEL]", `Initializing service: ${service.name}`);
                await service.init();
                this.emit("service:ready", service.name);
            }
        } catch (err) {
            error("[KERNEL]", `Failed to initialize service ${name}: ${err}`);
            throw err;
        }
    }
}

    private async shutdownServices(): Promise<void> {
        // Shutdown in reverse registration order
        const services = Object.values(this.kmods).reverse();
        for (const service of services) {
            if (typeof service.shutdown === "function") {
                log("Shutting down service", service.name);
                await service.shutdown();
                this.emit("service:shutdown", service.name);
            }
        }
    }

    
    private handleProcessSignals() {
        if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
            window.addEventListener("beforeunload", () => {
                void this.stop().catch((e) => this.handleError(e));
            });
        }
    }

    private handleError(e: Error) {
        error("[KERNEL]", `KERNEL ERROR DETECTED! TERMINATING. ${e.stack}`)

        this.stop();

        return true;
    }
}

function processEnvSafely(): Record<string, string> {
    try {
        const anyGlobal = globalThis as any;
        const envFromProcess = typeof anyGlobal.process !== "undefined" && anyGlobal.process && anyGlobal.process.env
            ? { ...anyGlobal.process.env }
            : undefined;
        return envFromProcess ?? {};
    } catch {
        return {};
    }
}

// Export a default kernel instance for easy use
export const kernel = new H2OKernel({ debug: false });