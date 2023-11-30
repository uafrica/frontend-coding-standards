"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsTodo = exports.addRenderMethodsComment = void 0;
const renderMethodsCommentText = `/* --------------------------------*/
/* RENDER METHODS */
/* --------------------------------*/`;
function addRenderMethodsComment(data) {
    if (data.indexOf("RENDER METHODS") === -1) {
        let firstRenderFunctionIndex = data.indexOf("function render");
        if (firstRenderFunctionIndex > -1) {
            const part1 = data.slice(0, firstRenderFunctionIndex);
            const part2 = data.slice(firstRenderFunctionIndex);
            data = part1 + renderMethodsCommentText + "\n" + "\n" + part2;
        }
    }
    return data;
}
exports.addRenderMethodsComment = addRenderMethodsComment;
function containsTodo(data) {
    const regex = /\bTODO\b/gi;
    return Boolean(data.match(regex));
}
exports.containsTodo = containsTodo;
