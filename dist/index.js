"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");
const utils = require("./src/utils");
const namingConventionUtils = require("./src/namingConventionUtils");
const commentUtils = require("./src/commentUtils");
const importUtils = require("./src/importUtils");
const args = yargs
    .options({
    folderPath: {
        description: "Path to the folder from where to start the code check",
        type: "string",
    },
})
    .help()
    .alias("help", "h").argv;
const folderPath = args.folderPath;
let errors = {
    incorrectInterfaceNames: [],
    incorrectInterfaceFileNames: [],
    incorrectComponentNames: [],
    incorrectComponentFileNames: [],
    missingFontawesomeIconImports: [],
};
let warnings = {
    filesMissingRenderFunction: [],
    incorrectlyNamedVariables: [],
    incorrectlyNamedStateVariables: [],
    incorrectlyNamedShowModalVariables: [],
    incorrectTruthy: [],
    classComponents: [],
    forgottenTodos: [],
};
let allImportNames = [];
let setupIconsContent;
function processFileContents(folderPath, file) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            return readTSXFilesRecursively(filePath).then(() => {
                resolve(true);
            });
        }
        else if (stat.isFile() &&
            (filePath.endsWith(".tsx") || filePath.endsWith(".ts"))) {
            fs.readFile(filePath, "utf8", (err, data) => {
                if (err) {
                    reject(`Error reading file: ${filePath}`);
                }
                else {
                    /* --------------------------------*/
                    /* AUTOMATIC UPDATES               */
                    /* --------------------------------*/
                    data = replaceBracketPattern(data);
                    data = addRenderMethodsComment(data, filePath);
                    data = fixLodashImports(data, filePath);
                    data = listMissingFontawesomeImports(data);
                    // // data = makeCommentsSentenceCase(data); // todo needs more testing
                    /* --------------------------------*/
                    /* CHECKS                          */
                    /* --------------------------------*/
                    checkStateVariableNamingConventions(data, file, filePath);
                    checkVariableNamingConventions(data, file, filePath);
                    // checkShowModalNamingConventions(data, file, filePath); // todo needs to be defined better
                    checkForRenderFunction(data, filePath);
                    checkForBooleanTruthyDetection(data, filePath);
                    checkForClassComponent(data, filePath);
                    checkForgottenTodos(data, filePath);
                    if (utils.isInterfaceFile(filePath)) {
                        checkInterfaceNamingConventions(data, file);
                    }
                    if (utils.isComponentFile(data, filePath)) {
                        checkComponentNamingConventions(data, file, filePath);
                    }
                    fs.writeFile(filePath, data, "utf8", (err) => {
                        if (err) {
                            reject(`Error writing to file: ${filePath}`);
                        }
                        else {
                            resolve(true);
                        }
                    });
                }
            });
        }
        else {
            resolve(true);
        }
    });
}
function readTSXFilesRecursively(folderPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = fs.readdirSync(folderPath);
        let promises = [];
        files.forEach((file) => __awaiter(this, void 0, void 0, function* () {
            promises.push(processFileContents(folderPath, file));
        }));
        return Promise.all(promises);
    });
}
function replaceBracketPattern(data) {
    try {
        // CRITERIA: Object string props should not have curly braces if no logical operations are performed on the string
        const regex = /={"([^+}]+)"}/g;
        data = data.replace(regex, '="$1"');
    }
    catch (e) {
        utils.writeOutput("error", `Could not replace bracket pattern: ${e}`);
    }
    return data;
}
function checkForRenderFunction(data, filePath) {
    try {
        // CRITERIA: All components should have a render function
        if (utils.isComponentFile(data, filePath) &&
            data.indexOf("function render()") === -1) {
            warnings.filesMissingRenderFunction.push({ file: filePath });
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check for render function: ${e}`);
    }
}
function checkForBooleanTruthyDetection(data, filePath) {
    try {
        // CRITERIA: Prefer boolean truthy detection Boolean(x) over double !!
        if (data.indexOf("!!") > -1) {
            warnings.incorrectTruthy.push({ file: filePath });
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check for boolean truthy detection: ${e}`);
    }
}
function checkForClassComponent(data, filePath) {
    try {
        // CRITERIA: Make use of functional components instead of class components
        if (data.indexOf("extends Component") > -1) {
            warnings.classComponents.push({ file: filePath });
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check for class component: ${e}`);
    }
}
function checkInterfaceNamingConventions(data, file) {
    try {
        // CRITERIA: Interface file name should follow the pattern <someInterfaceName>.interface.ts
        if (!namingConventionUtils.isValidInterfaceFileName(file)) {
            errors.incorrectInterfaceFileNames.push({ file });
        }
        // CRITERIA: Interface name should follow the pattern I<SomeInterfaceName>
        let interfaceName = utils.getInterfaceName(data);
        if (!namingConventionUtils.isValidInterfaceName(interfaceName)) {
            errors.incorrectInterfaceNames.push({ file, error: interfaceName });
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check interface naming conventions: ${e}`);
    }
}
function checkComponentNamingConventions(data, file, filePath) {
    try {
        if (filePath.indexOf("/pages") > -1) {
            // CRITERIA: Page component file name should follow the pattern <SomePageName>Page.tsx
            if (!namingConventionUtils.isValidPageComponentFileName(file)) {
                errors.incorrectComponentFileNames.push({ file });
            }
        }
        else if (filePath.indexOf("/components") > -1) {
            // CRITERIA: Component file name should follow the pattern <SomeComponentName>.tsx
            if (!namingConventionUtils.isValidComponentFileName(file)) {
                errors.incorrectComponentFileNames.push({ file });
            }
        }
        if (filePath.indexOf("/pages") > -1 ||
            filePath.indexOf("/components") > -1) {
            // CRITERIA: Component name should be upper camel case
            let componentName = utils.getComponentName(data);
            if (componentName) {
                if (!namingConventionUtils.isValidComponentName(componentName)) {
                    errors.incorrectComponentNames.push({ file, error: componentName });
                }
            }
            else {
                errors.incorrectComponentNames.push({
                    file,
                    error: "No component name found",
                });
            }
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check component naming conventions: ${e}`);
    }
}
function checkStateVariableNamingConventions(data, file, filePath) {
    try {
        // CRITERIA: State variables should be camel case
        let variableNames = utils.getStateVariables(data);
        variableNames.forEach((variableName) => {
            if (!namingConventionUtils.isValidStateVariableName(variableName) &&
                variableName !== file.split(".tsx").join("") &&
                !(filePath.includes("/Routes") && variableName.includes("Page"))) {
                warnings.incorrectlyNamedStateVariables.push({
                    file: filePath,
                    error: variableName,
                });
            }
        });
    }
    catch (e) {
        utils.writeOutput("error", `Could not check state variable naming conventions: ${e}`);
    }
}
function checkVariableNamingConventions(data, file, filePath) {
    try {
        // CRITERIA: Variables should be camel case or upper snake case
        let variableNames = utils.getVariables(data);
        variableNames.forEach((variableName) => {
            if (!namingConventionUtils.isValidVariableName(variableName) &&
                variableName !== file.split(".tsx").join("") &&
                !(filePath.includes("/Routes") && variableName.includes("Page"))) {
                warnings.incorrectlyNamedVariables.push({
                    file: filePath,
                    error: variableName,
                });
            }
        });
    }
    catch (e) {
        utils.writeOutput("error", `Could not check variable naming conventions: ${e}`);
    }
}
function checkShowModalNamingConventions(data, file, filePath) {
    try {
        // CRITERIA: When naming state variables to show/hide modals, make use of const [modalToShow, setModalToShow] = useState<string>("") or const [shouldShowXModal, setShouldShowXModal] = useState<boolean>(false)
        const stateVariableRegex = /(?<=\[\s*)(\w+)(?=\s*,\s*set\w+\s*\])/gm;
        let match;
        const shouldShowXModalRegex = /^shouldShow[A-Z][a-zA-Z]*Modal$/;
        while ((match = stateVariableRegex.exec(data)) !== null) {
            let stateVariableName = match[1];
            if (stateVariableName.toLowerCase().includes("modal") &&
                !shouldShowXModalRegex.test(stateVariableName) &&
                stateVariableName !== "modalToShow") {
                warnings.incorrectlyNamedShowModalVariables.push({
                    file: filePath,
                    error: stateVariableName,
                });
            }
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check modal naming conventions: ${e}`);
    }
}
function addRenderMethodsComment(data, filePath) {
    try {
        // CRITERIA: All components should have a comment indicating where the render methods section starts
        if (utils.isComponentFile(data, filePath)) {
            data = commentUtils.addRenderMethodsComment(data);
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not add render methods comment: ${e}`);
    }
    return data;
}
function fixLodashImports(data, filePath) {
    try {
        data = importUtils.fixLodashImports(data);
    }
    catch (e) {
        utils.writeOutput("error", `Could not fix lodash imports: ${e}`);
    }
    return data;
}
function listMissingFontawesomeImports(data) {
    try {
        let importNames = utils.getFontawesomeImportNames(data);
        importNames === null || importNames === void 0 ? void 0 : importNames.forEach((importName) => {
            if (!allImportNames.includes(importName) &&
                !setupIconsContent.includes(importName)) {
                errors.missingFontawesomeIconImports.push({
                    error: `Missing import for ${importName}`,
                });
                allImportNames.push(importName);
            }
        });
    }
    catch (e) {
        utils.writeOutput("error", `Could not list missing Fontawesome imports: ${e}`);
    }
    return data;
}
function makeCommentsSentenceCase(data) {
    // CRITERIA: All comments should be sentence case
    const singleLineCommentPattern = /\/\/(?!https?:\/\/).*$/gm;
    // const multiLineCommentPattern = /\/\*((?!\*\/|https?:\/\/)[\s\S])*?\*\//gm;
    // const commentPattern = new RegExp(
    //   `${singleLineCommentPattern.source}|${multiLineCommentPattern.source}`,
    //   "gm"
    // );
    const comments = data.match(singleLineCommentPattern);
    comments === null || comments === void 0 ? void 0 : comments.forEach((comment) => {
        let newComment = comment;
        if (newComment.indexOf("@ts") === -1) {
            newComment = newComment.replace(/\/\//g, "");
            newComment = newComment.replace(/\n/g, "");
            newComment = newComment.trim();
            let charZero = newComment.charAt(0);
            newComment = charZero.toUpperCase() + newComment.slice(1);
            newComment = "// " + newComment + "\n";
            if (charZero !== charZero.toUpperCase()) {
                data = data.replace(comment, newComment);
            }
        }
    });
    return data;
}
function checkForgottenTodos(data, filePath) {
    try {
        if (commentUtils.containsTodo(data)) {
            warnings.forgottenTodos.push({ file: filePath });
        }
    }
    catch (e) {
        utils.writeOutput("error", `Could not check forgotten todos: ${e}`);
    }
}
function getSetupIconsContent() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let filePath = folderPath + "/setupIcons.ts";
            fs.readFile(filePath, "utf8", (err, data) => {
                if (err) {
                    reject(`Error reading file: ${filePath}`);
                }
                else {
                    setupIconsContent = data;
                    resolve(true);
                }
            });
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!args.folderPath) {
            utils.writeOutput("error", "No path specified");
            return;
        }
        utils.writeOutput("info", "Running code checker...");
        return getSetupIconsContent().then(() => __awaiter(this, void 0, void 0, function* () {
            return readTSXFilesRecursively(folderPath)
                .then(() => {
                let errorCount = 0;
                Object.keys(errors).forEach((key) => {
                    // @ts-ignore
                    let errorArray = errors[key];
                    errorCount += errorArray === null || errorArray === void 0 ? void 0 : errorArray.length;
                    errorArray.length > 0 &&
                        utils.logErrors("error", utils.keyToHumanReadable(key), errorArray);
                });
                Object.keys(warnings).forEach((key) => {
                    // @ts-ignore
                    let warningArray = warnings[key];
                    warningArray.length > 0 &&
                        utils.logErrors("warning", utils.keyToHumanReadable(key), warningArray);
                });
                if (errorCount === 0) {
                    utils.writeOutput("info", "Done running code checker.");
                    process.exit(0);
                }
                else {
                    utils.writeOutput("error", "Done running code checker.");
                    process.exit(1);
                }
            })
                .catch((err) => {
                utils.writeOutput("error", err);
                process.exit(1);
            });
        }));
    });
}
run();
