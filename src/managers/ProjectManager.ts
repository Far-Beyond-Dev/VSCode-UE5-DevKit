import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { UE5Project } from '../types';

export class ProjectManager {
    constructor(private outputChannel: vscode.OutputChannel) {}

    async detectProject(): Promise<UE5Project | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return null;
        }

        for (const folder of workspaceFolders) {
            const files = await vscode.workspace.findFiles('*.uproject', null, 10);
            if (files.length > 0) {
                const uprojectPath = files[0].fsPath;
                const projectName = path.basename(uprojectPath, '.uproject');
                const projectPath = path.dirname(uprojectPath);

                return {
                    name: projectName,
                    path: projectPath,
                    uprojectPath: uprojectPath
                };
            }
        }

        return null;
    }

    getEngineVersion(project: UE5Project): string | null {
        try {
            const uprojectContent = fs.readFileSync(project.uprojectPath, 'utf8');
            const uprojectData = JSON.parse(uprojectContent);
            return uprojectData.EngineAssociation || null;
        } catch (error) {
            this.outputChannel.appendLine(`Error reading engine version: ${error}`);
            return null;
        }
    }
}