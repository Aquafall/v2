import { KMod } from "../../../types/kmod";
import { H2OKernel } from "../../h2o";
import { log } from "../../../logging/main";
import { writable } from "svelte/store";
import type { Process, ProcessInfo } from "../../../types/process";

export class ProcessManager extends KMod {
    private processes: Map<number, Process> = new Map();
    private nextPid = 1;
    public processStore = writable<ProcessInfo[]>([]);

    constructor(kernel: H2OKernel) {
        super();
        this.kernel = kernel;
        this.name = "process";
    }

    async init() {
        log("[ProcessManager]", "Process manager initialized");
    }

    createProcess(info: Partial<ProcessInfo>): Process {
        const pid = this.nextPid++;
        const process: Process = {
            pid,
            name: info.name || `process-${pid}`,
            status: 'running',
            startTime: Date.now(),
            type: info.type || 'background',
            metadata: info.metadata || {},
            kill: () => this.killProcess(pid)
        };

        this.processes.set(pid, process);
        this.updateStore();
        return process;
    }

    killProcess(pid: number): boolean {
        const success = this.processes.delete(pid);
        if (success) {
            this.updateStore();
        }
        return success;
    }

    getProcess(pid: number): Process | undefined {
        return this.processes.get(pid);
    }

    listProcesses(): ProcessInfo[] {
        return Array.from(this.processes.values()).map(p => ({
            pid: p.pid,
            name: p.name,
            status: p.status,
            startTime: p.startTime,
            type: p.type,
            metadata: p.metadata
        }));
    }

    private updateStore() {
        this.processStore.set(this.listProcesses());
    }
}