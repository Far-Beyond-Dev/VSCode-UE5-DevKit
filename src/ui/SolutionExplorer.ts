// src/ui/SolutionExplorer.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UE5Project, SolutionItem } from '../types';

export class SolutionExplorer implements vscode.TreeDataProvider<SolutionItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SolutionItem | undefined | null | void> = 
        new vscode.EventEmitter<SolutionItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SolutionItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private treeView: vscode.TreeView<SolutionItem>;

    constructor(
        private project: UE5Project,
        private context: vscode.ExtensionContext
    ) {
        this.treeView = vscode.window.createTreeView('ue5SolutionExplorer', {
            treeDataProvider: this
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SolutionItem): vscode.TreeItem {
        const treeItem = new vscode.TreeItem(
            element.name,
            element.type === 'folder' || element.type === 'plugin' ?
                vscode.TreeItemCollapsibleState.Collapsed :
                vscode.TreeItemCollapsibleState.None
        );

        if (element.type === 'file') {
            treeItem.command = {
                command: 'ue5.openFile',
                title: 'Open File',
                arguments: [element.path]
            };
            treeItem.contextValue = 'file';
            treeItem.iconPath = this.getFileIcon(element.name);
        } else if (element.type === 'plugin') {
            treeItem.iconPath = this.getUnrealIcon();
            treeItem.contextValue = element.buildable ? 'buildablePlugin' : 'plugin';
            treeItem.tooltip = `Plugin: ${element.name}${element.buildable ? ' (Buildable)' : ''}`;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('folder');
            treeItem.contextValue = 'folder';
        }

        return treeItem;
    }

    getChildren(element?: SolutionItem): Thenable<SolutionItem[]> {
        if (element) {
            if (element.type === 'plugin') {
                return Promise.resolve(this.getPluginContents(element.path));
            } else if (element.children && element.children.length > 0) {
                return Promise.resolve(element.children);
            } else {
                return Promise.resolve(this.getFilesAndFolders(element.path));
            }
        } else {
            return Promise.resolve(this.getProjectStructure());
        }
    }

    private getFileIcon(fileName: string): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case '.h':
                return new vscode.ThemeIcon('symbol-class');
            case '.cpp':
                return new vscode.ThemeIcon('symbol-method');
            case '.cs':
                return new vscode.ThemeIcon('symbol-keyword');
            case '.uproject':
            case '.uplugin':
                return this.getUnrealIcon();
            case '.uasset':
                return new vscode.ThemeIcon('symbol-property');
            default:
                return new vscode.ThemeIcon('file');
        }
    }

    private getUnrealIcon(): { light: vscode.Uri; dark: vscode.Uri } {
        return {
            light: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-black.png'),
            dark: vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'unreal-white.png')
        };
    }

    private getProjectStructure(): SolutionItem[] {
        const items: SolutionItem[] = [];

        const folders = ['Source', 'Content', 'Config'];
        folders.forEach(folder => {
            const folderPath = path.join(this.project.path, folder);
            if (fs.existsSync(folderPath)) {
                items.push({
                    name: folder,
                    path: folderPath,
                    type: 'folder'
                });
            }
        });

        // Add plugins folder with plugin detection
        const pluginsFolder = path.join(this.project.path, 'Plugins');
        if (fs.existsSync(pluginsFolder)) {
            const pluginItems = this.getPluginItems(pluginsFolder);
            if (pluginItems.length > 0) {
                items.push({
                    name: 'Plugins',
                    path: pluginsFolder,
                    type: 'folder',
                    children: pluginItems
                });
            }
        }

        // Add .uproject file
        if (fs.existsSync(this.project.uprojectPath)) {
            items.push({
                name: this.project.name + '.uproject',
                path: this.project.uprojectPath,
                type: 'file'
            });
        }

        return items;
    }

    private getPluginItems(pluginsFolder: string): SolutionItem[] {
        const pluginItems: SolutionItem[] = [];

        try {
            const pluginDirs = fs.readdirSync(pluginsFolder).filter(item => {
                const pluginPath = path.join(pluginsFolder, item);
                return fs.statSync(pluginPath).isDirectory();
            });

            for (const pluginDir of pluginDirs) {
                const pluginPath = path.join(pluginsFolder, pluginDir);
                const upluginPath = path.join(pluginPath, pluginDir + '.uplugin');

                if (fs.existsSync(upluginPath)) {
                    let pluginDescriptor = null;
                    let isBuildable = false;

                    try {
                        const pluginContent = fs.readFileSync(upluginPath, 'utf8');
                        pluginDescriptor = JSON.parse(pluginContent);

                        const pluginSourcePath = path.join(pluginPath, 'Source');
                        isBuildable = fs.existsSync(pluginSourcePath) &&
                            fs.readdirSync(pluginSourcePath).length > 0;

                    } catch (error) {
                        console.error(`Error reading plugin descriptor: ${error}`);
                    }

                    pluginItems.push({
                        name: pluginDir,
                        path: pluginPath,
                        type: 'plugin',
                        buildable: isBuildable,
                        pluginDescriptor: pluginDescriptor
                    });
                }
            }
        } catch (error) {
            console.error('Error reading plugins folder:', error);
        }

        return pluginItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    private getPluginContents(pluginPath: string): SolutionItem[] {
        const items: SolutionItem[] = [];

        try {
            const pluginName = path.basename(pluginPath);
            const upluginPath = path.join(pluginPath, pluginName + '.uplugin');
            
            if (fs.existsSync(upluginPath)) {
                items.push({
                    name: pluginName + '.uplugin',
                    path: upluginPath,
                    type: 'file'
                });
            }

            const folders = ['Source', 'Content', 'Config'];
            folders.forEach(folder => {
                const folderPath = path.join(pluginPath, folder);
                if (fs.existsSync(folderPath)) {
                    items.push({
                        name: folder,
                        path: folderPath,
                        type: 'folder'
                    });
                }
            });

        } catch (error) {
            console.error('Error reading plugin contents:', error);
        }

        return items;
    }

    private getFilesAndFolders(folderPath: string): SolutionItem[] {
        const items: SolutionItem[] = [];

        try {
            const files = fs.readdirSync(folderPath);

            files.forEach(file => {
                const fullPath = path.join(folderPath, file);
                const stat = fs.statSync(fullPath);

                items.push({
                    name: file,
                    path: fullPath,
                    type: stat.isDirectory() ? 'folder' : 'file'
                });
            });
        } catch (error) {
            console.error('Error reading directory:', error);
        }

        return items.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });
    }
}