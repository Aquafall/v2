import { H2OKernel } from "../kernel/h2o";

export type Service = {
    name: string;
    init?: (kernel: H2OKernel) => Promise<void> | void;
    shutdown?: () => Promise<void> | void;
    [key: string]: any;
    killProcess: (pid: Number) => Promise<void> | void;
};