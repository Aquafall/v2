import type { Service } from "../types/service";
import AppRenderContext from "./AppRenderContext.svelte";
import { mount } from "svelte";
import { H2OKernel } from "../kernel/h2o";
import { log, error } from "../logging/main";

export class AquafallRenderer implements Service {
    name = "AquafallRendererService";
    renderer: any;

    constructor() {
        this.renderer = null as any;
    }

    async init(kernel: H2OKernel): Promise<void> {
        log("[AquafallRenderer]", "Renderer service initialized");
        this.start();
    }

    async killProcess() {
        log("[AquafallRenderer]", "Renderer service shutting down");
    }

    async start() {
        const renderer = mount(AppRenderContext, { target: document.getElementById("app") });
        this.renderer = renderer;
    }
}