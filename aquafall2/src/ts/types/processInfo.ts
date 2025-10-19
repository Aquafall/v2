export interface ProcessInfo {
    pid: number;
    name: string;
    status: 'running' | 'stopped' | 'suspended';
    startTime: number;
    type: 'system' | 'user' | 'background';
    metadata: Record<string, any>;
}
