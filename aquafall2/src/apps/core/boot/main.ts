import { type Process } from "$ts/types/process";
import type { SvelteComponent } from "svelte";
import { type Window } from "$ts/types/window";
import BootAppComponent from "./BootApp.svelte";
import {BootAppMetadata} from "./metadata";


export class BootApp implements Process {
    pid: number;
    name: string;
    status: Process["status"];
    type: Process["type"] = "system";
    startTime: number;
    appComponent: SvelteComponent;
    metadata: BootAppMetadata = new BootAppMetadata();

    kill(): boolean {
        return false;
    }

    constructor(pid: number) {
        this.pid = pid;
        this.name = "BootApp";
        this.status = 'running';
        this.startTime = Date.now();
        this.appComponent = new BootAppComponent();
    }

    async start() {
        
    }
}