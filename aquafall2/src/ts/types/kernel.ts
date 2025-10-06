export type KernelConfig = {
    name: string;
    version: string;
    env?: Record<string, string>;
    debug?: boolean;
};

export type Kernel = {
    start: () => Promise<void>;
    stop: () => Promise<void>;
    config: KernelConfig;
}