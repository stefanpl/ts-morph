import { StringUtils, ts } from "@ts-morph/common";
import { CompilerCommentNode } from "./CompilerComments";

enum CommentKind {
    SingleLine,
    MultiLine,
    JsDoc
}

export interface CommentScanner {
    setParent(parent: ts.Node): void;
    setFullStartAndPos(pos: number): void;
    setPos(newPos: number): void;
    getPos(): number;
    scanForNewLines(): Iterable<CompilerCommentNode | ts.JSDoc>;
    scanUntilToken(): Iterable<CompilerCommentNode | ts.JSDoc>;
    scanUntilNewLineOrToken(): Iterable<CompilerCommentNode | ts.JSDoc>;
}

export function createCommentScanner(sourceFile: ts.SourceFile): CommentScanner {
    const sourceFileText = sourceFile.text;
    const commentCache = new Map<number, CompilerCommentNode | ts.JSDoc>();
    let parent: ts.Node = sourceFile;
    let fullStart = 0;
    let pos = 0;

    return {
        setParent(newParent: ts.Node) {
            parent = newParent;
        },
        setFullStartAndPos(newPos: number) {
            pos = newPos;
            fullStart = newPos;
        },
        setPos(newPos: number) {
            pos = newPos;
        },
        getPos() {
            return pos;
        },
        scanForNewLines,
        scanUntilToken,
        scanUntilNewLineOrToken,
    };

    function* scanForNewLines() {
        let foundNewLineAfterComment = false;
        let foundComment = false;
        while (pos < sourceFileText.length) {
            const commentKind = skipUntilNewLineTokenOrComment();
            if (typeof commentKind === "number") {
                if (foundNewLineAfterComment)
                    return;
                yield parseForComment(commentKind);
                foundComment = true;
            }
            else if (commentKind === "non-whitespace") {
                return;
            }
            else if (commentKind === "newline") {
                if (foundComment)
                    foundNewLineAfterComment = true;
            }
        }
    }

    function* scanUntilToken() {
        while (pos < sourceFileText.length) {
            const scanResult = skipUntilNewLineTokenOrComment();
            if (typeof scanResult === "number")
                yield parseForComment(scanResult);
            else if (scanResult === "non-whitespace")
                return;
        }
    }

    function* scanUntilNewLineOrToken() {
        while (pos < sourceFileText.length) {
            const scanResult = skipUntilNewLineTokenOrComment();
            if (typeof scanResult === "number")
                yield parseForComment(scanResult);
            else
                return;
        }
    }

    function skipUntilNewLineTokenOrComment() {
        while (pos < sourceFileText.length) {
            const commentKind = getCommentKind();
            if (commentKind != null)
                return commentKind;
            else if (!StringUtils.isWhitespaceChar(sourceFileText[pos]))
                return "non-whitespace";
            else if (sourceFileText[pos] === "\n") {
                pos++;
                return "newline";
            }
            else {
                pos++;
            }
        }
        return undefined;
    }

    function getCommentKind() {
        const currentChar = sourceFileText[pos];
        if (currentChar !== "/")
            return undefined;

        const nextChar = sourceFileText[pos + 1];
        if (nextChar === "/")
            return CommentKind.SingleLine;

        if (nextChar !== "*")
            return undefined;

        return CommentKind.MultiLine;
    }

    function parseForComment(commentKind: CommentKind) {
        const start = pos;
        let comment = commentCache.get(start);
        if (comment == null) {
            if (commentKind === CommentKind.SingleLine)
                comment = parseSingleLineComment();
            else if (sourceFile.endOfFileToken.pos <= start) {
                const jsDocs = (sourceFile.endOfFileToken as any).jsDoc as ts.JSDoc[] | undefined;
                comment = jsDocs?.find(d => d.pos === start) ?? parseMultiLineComment();
                pos = comment.end;
            }
            else {
                comment = parseMultiLineComment();
            }
            commentCache.set(start, comment);
        }
        else {
            pos = comment.end;
        }

        return comment;
    }

    function parseSingleLineComment() {
        const start = pos;
        skipSingleLineComment();
        const end = pos;
        return new CompilerCommentNode(fullStart, start, end, ts.SyntaxKind.SingleLineCommentTrivia, sourceFile, parent);
    }

    function skipSingleLineComment() {
        pos += 2; // skip the slash slash

        while (pos < sourceFileText.length && sourceFileText[pos] !== "\n" && sourceFileText[pos] !== "\r")
            pos++;
    }

    function parseMultiLineComment() {
        const start = pos;
        skipSlashStarComment();
        const end = pos;

        return new CompilerCommentNode(fullStart, start, end, ts.SyntaxKind.MultiLineCommentTrivia, sourceFile, parent);
    }

    function skipSlashStarComment() {
        pos += 2; // skip slash star star

        while (pos < sourceFileText.length) {
            if (sourceFileText[pos] === "*" && sourceFileText[pos + 1] === "/") {
                pos += 2; // skip star slash
                break;
            }
            pos++;
        }
    }
}
