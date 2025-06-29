export interface UE5Project {
    name: string;
    path: string;
    uprojectPath: string;
}

export interface SolutionItem {
    name: string;
    path: string;
    type: 'folder' | 'file' | 'plugin';
    children?: SolutionItem[];
    buildable?: boolean;
    pluginDescriptor?: any;
}

export interface BuildConfiguration {
    name: string;
    platform: string;
    configuration: string;
}

export interface UE5Config {
    enginePath: string;
    defaultPlatform: string;
    defaultBuildConfiguration: string;
    showBuildOutput: boolean;
}