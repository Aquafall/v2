import { type Window } from "../types/window.ts";

export class WindowStore {
    public windows = $state<Record<number, Window>>({});

    registerWindow(window: Window) {
        this.windows[1] = (window);
    }
}
