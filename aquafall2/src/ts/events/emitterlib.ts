export class SimpleEventEmitter {
    private events: Record<string, Function[]> = {};

    on(event: string, callback: Function): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event: string, ...args: any[]): void {
        const callbacks = this.events[event];
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }

    removeListener(event: string, callback: Function): void {
        const callbacks = this.events[event];
        if (callbacks) {
            this.events[event] = callbacks.filter(cb => cb !== callback);
        }
    }
}