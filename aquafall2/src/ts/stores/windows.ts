import { type Window } from "../types/window.ts";

export class WindowStore {
    public windows: Array<Window> = [];

    registerWindow(window: Window) {
        this.windows.push(window);
    }

    testInit() {
        this.registerWindow({ name: "BootApp", processID: 1 });
        setTimeout(() => {
            this.registerWindow({ name: "TestApp", processID: 2 });
        }, 2000);
    }
}
