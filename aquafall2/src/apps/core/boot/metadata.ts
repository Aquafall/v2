import type { ProcInfo } from "../../../ts/types/processInfo";

export class BootAppMetadata implements ProcInfo {
    name?: "BootApp";
    version?: "2.0.0";
    icon?: "BootApp";
    description?: "Boot screen";
    category?: "none";
    supportedParams?: any[] | undefined;
    windowData?: { 
        defaultWidth: -1; 
        defaultHeight: -1; 
        maxWidth: -1; 
        maxHeight: -1; 
        minWidth: -1; 
        minHeight: -1; 
        maximised: true; 
        minimised: false; 
        headless: true; 
        resizable: false;
    };
    core?: true;
}