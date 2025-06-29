import * as vscode from 'vscode';
import { UE5DevTools } from './core/UE5DevTools';

export function activate(context: vscode.ExtensionContext) {
    const ue5Tools = new UE5DevTools();
    ue5Tools.initialize(context);
}

export function deactivate() { }