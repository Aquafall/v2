

export function log(from: string, content: string) {
    let currentTime: Number = new Date().getTime()

    console.log(`[${currentTime}] ${from}: ${content}`)
}

export function error(from: string, content: string) {
    let currentTime: Number = new Date().getTime()
    console.error(`[!] [${currentTime}] ${from}: ${content}`)
}