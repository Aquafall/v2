import type { Service } from "./service";

export class Process {
    private pid!: Number;
    private parentService!: Service;

    constructor(pid: Number, parentService: Service) {
        this.pid = pid;
        this.parentService = parentService;
    }

    public stop() {
        this.parentService.killProcess(this.pid);
    }
}