import { kernel } from "../kernel/h2o";
import type { KMod } from "../types/kmod";
import { UserKMod } from "../kernel/modules/user/main";
import { ProcessManager } from "../kernel/modules/procman/procman";
import{ BugRepKMod } from "../kernel/modules/bugrep/main";

export let KMods: Record<string, KMod> = {
    bugrep: BugRepKMod,

    user: UserKMod,
    
    process: ProcessManager,
}