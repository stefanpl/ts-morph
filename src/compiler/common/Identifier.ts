﻿import * as ts from "typescript";
import {Node} from "./Node";

export class Identifier extends Node<ts.Identifier> {
    // todo: remove
    getText() {
        return this.node.text;
    }

    /**
     * Renames an identifier.
     * @param newName - New name of the identifier.
     */
    rename(newName: string) {
        this.factory.getLanguageService().renameNode(this, newName);
    }
}
