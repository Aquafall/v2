import { type Process } from "$ts/types/process";

export class BootApp implements Process {
    pid: number;
    name: string;
    status: 'running' | 'stopped' | 'suspended';
    startTime: number;

    constructor(pid: number) {
        this.pid = pid;
        this.name = "BootApp";
        this.status = 'running';
        this.startTime = Date.now();
    }

    async start() {
        
    }
}