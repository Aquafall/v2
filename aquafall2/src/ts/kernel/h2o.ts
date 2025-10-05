import { EventEmitter } from "events";

export type Service = {
    name: string;
    init?: (kernel: H2OKernel) => Promise<void> | void;
    shutdown?: () => Promise<void> | void;
    [key: string]: any;
};

export type KernelConfig = {
    name: string;
    version: string;
    env?: Record<string, string>;
    debug?: boolean;
};

export class H2OKernel extends EventEmitter {
    private services = new Map<string, Service>();
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
        this.log("[KERNEL]", `Starting kernel ${JSON.stringify(this.config)}`);
        this.emit("startup:begin");

        try {
            await this.initServices();
            this.started = true;
            this.emit("startup:done");
            this.log("[KERNEL]", "Kernel started");
            throw new Error("Tests")
        } catch (err) {
            this.emit("startup:error", err);
            this.handleError(err);
            throw err;
        }
    }

    async stop(): Promise<void> {
        if (!this.started) return;
        this.log("[KERNEL]", "Shutting down kernel");
        this.emit("shutdown:begin");
        try {
            await this.shutdownServices();
            this.started = false;
            this.emit("shutdown:done");
            this.log("[KERNEL]", "Kernel stopped");
        } catch (err) {
            this.emit("shutdown:error", err);
            this.handleError(err);
            throw err;
        }
    }

    async restart(): Promise<void> {
        this.log("[KERNEL]", "Restarting kernel");
        await this.stop();
        await this.start();
    }

    registerService<S extends Service>(service: S): S {
        if (!service || !service.name) {
            throw new Error("Service must have a name");
        }
        if (this.services.has(service.name)) {
            throw new Error(`Service already registered: ${service.name}`);
        }
        this.services.set(service.name, service);
        this.emit("service:registered", service.name);
        this.log("[SVCMAN]", `Service registered: ${service.name}`);
        return service;
    }

    getService<T extends Service = Service>(name: string): T | undefined {
        return this.services.get(name) as T | undefined;
    }

    private async initServices(): Promise<void> {
        for (const service of Array.from(this.services.values())) {
            if (typeof service.init === "function") {
                this.log("Initializing service", service.name);
                await service.init(this);
                this.emit("service:ready", service.name);
            }
        }
    }

    private async shutdownServices(): Promise<void> {
        // Shutdown in reverse registration order
        const services = Array.from(this.services.values()).reverse();
        for (const service of services) {
            if (typeof service.shutdown === "function") {
                this.log("Shutting down service", service.name);
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

    public log(from: string, content: string) {
        let currentTime: Number = new Date().getTime()

        console.log(`[${currentTime}] ${from}: ${content}`)
    }

    public error(from: string, content: string) {
        let currentTime: Number = new Date().getTime()
        console.error(`[!] [${currentTime}] ${from}: ${content}`)
    }

    private handleError(e: Error) {
        this.error("[KERNEL]", `KERNEL ERROR DETECTED! TERMINATING. ${e.stack}`)

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