

let logs: Record<number, String> = {};

export function getLogs() {
    return logs;
}

export function log(from: string, content: string) {
    let currentTime: number = new Date().getTime()

    let str = `[${currentTime}] ${from}: ${content}`;

    logs[currentTime] = str;

    console.log(str);
}

export function error(from: string, content: string) {
    let currentTime: number = new Date().getTime()
    let str = `[!] [${currentTime}] ${from}: ${content}`;
    logs[currentTime] = str;
    console.error(str);
}