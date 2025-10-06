import { kernel } from "../kernel/h2o";
import type { KMod } from "../types/kmod";
import { UserKMod } from "../kernel/modules/user/main";

export let KMods: Record<string, KMod> = {
    /*bugrep: {
        name: "bugrep",
        init: async (kernel) => {
            console.log("bugrep initialized");
        }
    },*/
    user: UserKMod,
}