let appPathList = [
    "../../apps/core/boot/main.ts",
    "../../apps/core/login/main.ts",
]

let loadedModules: Record<string, any> = {};

for (let appPath of appPathList) {
    import(appPath).then((module) => {
        loadedModules[appPath] = module;
        console.log(`Loaded module from ${appPath}:`, module);
    }).catch((error) => {
        console.error(`Failed to load module from ${appPath}:`, error);
    });
}

export { appPathList, loadedModules };