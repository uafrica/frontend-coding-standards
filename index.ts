const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

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

interface IErrorObject {
  file?: string;
  error?: any;
}

let errors: {
  incorrectInterfaceNames: IErrorObject[];
  incorrectInterfaceFileNames: IErrorObject[];
  incorrectComponentNames: IErrorObject[];
  incorrectComponentFileNames: IErrorObject[];
  missingFontawesomeIconImports: IErrorObject[];
} = {
  incorrectInterfaceNames: [],
  incorrectInterfaceFileNames: [],
  incorrectComponentNames: [],
  incorrectComponentFileNames: [],
  missingFontawesomeIconImports: [],
};
let warnings: {
  filesMissingRenderFunction: IErrorObject[];
  incorrectlyNamedVariables: IErrorObject[];
  incorrectlyNamedStateVariables: IErrorObject[];
  incorrectlyNamedShowModalVariables: IErrorObject[];
  incorrectTruthy: IErrorObject[];
  classComponents: IErrorObject[];
  forgottenTodos: IErrorObject[];
} = {
  filesMissingRenderFunction: [],
  incorrectlyNamedVariables: [],
  incorrectlyNamedStateVariables: [],
  incorrectlyNamedShowModalVariables: [],
  incorrectTruthy: [],
  classComponents: [],
  forgottenTodos: [],
};

const camelCaseRegex = /^[a-z][A-Za-z0-9]*$/;
const upperCamelCaseRegex = /^[A-Z][A-Za-z0-9]*$/;
const upperSnakeCaseRegex = /^[A-Z0-9_]+$/;

let allImportNames: string[] = [];
let setupIconsContent: any;
function keyToHumanReadable(key: string | undefined): string {
  if (!key) return "";

  // @ts-ignore
  let keyHumanReadable = key.replaceAll("_", " ");
  keyHumanReadable = keyHumanReadable.replaceAll("sender", "collection");
  keyHumanReadable = keyHumanReadable.replaceAll("receiver", "delivery");
  keyHumanReadable = keyHumanReadable.replaceAll("-", " ");

  // camel case to sentence case
  keyHumanReadable = keyHumanReadable.replace(/([A-Z])/g, " $1").trim();

  let sentenceCaseKey =
    keyHumanReadable.charAt(0).toUpperCase() +
    keyHumanReadable.slice(1).toLowerCase();

  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob box", "Bob Box");
  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob pay", "Bob Pay");
  sentenceCaseKey = sentenceCaseKey.replaceAll("Bob go", "Bob Go");

  return sentenceCaseKey;
}

function writeOutput(
  type: "success" | "error" | "warning" | "info",
  content: any
) {
  let colors = {
    success: "\x1b[32m",
    error: "\x1b[31m",
    warning: "\x1b[33m",
    info: "\x1b[36m",
  };
  console.log(colors[type], content);
}

function isInterfaceFile(filePath: string) {
  return filePath.indexOf("src/interfaces") > -1;
}

function isComponentFile(data: string, filePath: string) {
  return (
    filePath.endsWith(".tsx") &&
    !isInterfaceFile(filePath) &&
    (filePath.indexOf("/pages/") > -1 ||
      filePath.indexOf("/components/") > -1) &&
    data.indexOf("function render") > -1
  );
}

function processFileContents(folderPath: any, file: any) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      return readTSXFilesRecursively(filePath).then(() => {
        resolve(true);
      });
    } else if (
      stat.isFile() &&
      (filePath.endsWith(".tsx") || filePath.endsWith(".ts"))
    ) {
      fs.readFile(filePath, "utf8", (err: any, data: string) => {
        if (err) {
          reject(`Error reading file: ${filePath}`);
        } else {
          // Automatic updates to files
          data = replaceBracketPattern(data);
          data = addRenderMethodsComment(data, filePath);
          data = fixLodashImports(data, filePath);
          data = listMissingFontawesomeImports(data);
          // // data = makeCommentsSentenceCase(data); // todo needs more testing
          // // Checks for files
          checkStateVariableNamingConventions(data, file, filePath);
          checkVariableNamingConventions(data, file, filePath);
          // // checkShowModalNamingConventions(data, file, filePath); // todo needs to be defined better
          checkForRenderFunction(data, filePath);
          checkForBooleanTruthyDetection(data, filePath);
          checkForClassComponent(data, filePath);
          checkForgottenTodos(data, filePath);
          if (isInterfaceFile(filePath)) {
            checkInterfaceNamingConventions(data, file);
          }
          if (isComponentFile(data, filePath)) {
            checkComponentNamingConventions(data, file, filePath);
          }
          fs.writeFile(filePath, data, "utf8", (err: any) => {
            if (err) {
              reject(`Error writing to file: ${filePath}`);
            } else {
              resolve(true);
            }
          });
        }
      });
    } else {
      resolve(true);
    }
  });
}

async function readTSXFilesRecursively(folderPath: string) {
  const files = fs.readdirSync(folderPath);
  let promises: any[] = [];
  files.forEach(async (file: any) => {
    promises.push(processFileContents(folderPath, file));
  });

  return Promise.all(promises);
}

function replaceBracketPattern(data: string) {
  // CRITERIA: Object string props should not have curly braces if no logical operations are performed on the string
  const regex = /={"([^+}]+)"}/g;

  const replacedContent = data.replace(regex, '="$1"');

  return replacedContent;
}

function checkForRenderFunction(data: string, filePath: string) {
  // CRITERIA: All components should have a render function
  if (
    isComponentFile(data, filePath) &&
    data.indexOf("function render()") === -1
  ) {
    warnings.filesMissingRenderFunction.push({ file: filePath });
  }
}
function checkForBooleanTruthyDetection(data: string, filePath: string) {
  // CRITERIA: Prefer boolean truthy detection Boolean(x) over double !!
  if (data.indexOf("!!") > -1) {
    warnings.incorrectTruthy.push({ file: filePath });
  }
}

function checkForClassComponent(data: string, filePath: string) {
  // CRITERIA: Make use of functional components instead of class components
  if (data.indexOf("extends Component") > -1) {
    warnings.classComponents.push({ file: filePath });
  }
}

function checkInterfaceNamingConventions(data: string, file: string) {
  // CRITERIA: Interface file name should follow the pattern <someInterfaceName>.interface.ts
  const interfaceFileNamePattern = /^[a-z][A-Za-z]*\.interface\.ts$/;

  if (!interfaceFileNamePattern.test(file)) {
    errors.incorrectInterfaceFileNames.push({ file });
  }

  // CRITERIA: Interface name should follow the pattern I<SomeInterfaceName>
  const interfaceNamePattern = /^I[A-Z][a-zA-Z]*$/;
  let interfaceNameStartIndex =
    data.indexOf("export interface ") + "export interface ".length;

  let substring = data.slice(interfaceNameStartIndex);

  let interfaceNameEndIndex = substring.indexOf(" ");
  let interfaceName = substring.slice(0, interfaceNameEndIndex);
  if (!interfaceNamePattern.test(interfaceName)) {
    errors.incorrectInterfaceNames.push({ file, error: interfaceName });
  }
}

function checkComponentNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  if (filePath.indexOf("/pages") > -1) {
    // CRITERIA: Page component file name should follow the pattern <SomePageName>Page.tsx
    const pageComponentFileNamePattern = /^[A-Z][A-Za-z0-9]*\Page\.tsx$/;

    if (!pageComponentFileNamePattern.test(file)) {
      errors.incorrectComponentFileNames.push({ file });
    }
  } else if (filePath.indexOf("/components") > -1) {
    // CRITERIA: Component file name should follow the pattern <SomeComponentName>.tsx
    const componentFileNamePattern = /^[A-Z][A-Za-z0-9]*\.tsx$/;

    if (!componentFileNamePattern.test(file)) {
      errors.incorrectComponentFileNames.push({ file });
    }
  }

  if (filePath.indexOf("/pages") > -1 || filePath.indexOf("/components") > -1) {
    // CRITERIA: Component name should be upper camel case
    const componentNamePattern = /function\s+([a-zA-Z0-9]*)\(/;
    let match = componentNamePattern.exec(data);
    if (match) {
      let componentName = match[1];
      if (!upperCamelCaseRegex.test(componentName)) {
        errors.incorrectComponentNames.push({ file, error: componentName });
      }
    } else {
      errors.incorrectComponentNames.push({
        file,
        error: "No component name found",
      });
    }
  }
}

function checkStateVariableNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  // CRITERIA: State variables should be camel case
  const stateVariableRegex = /(?<=\[\s*)(\w+)(?=\s*,\s*set\w+\s*\])/gm;

  const variableNames = [];
  let match;

  while ((match = stateVariableRegex.exec(data)) !== null) {
    variableNames.push(match[1]);
  }

  variableNames.forEach((variableName) => {
    if (
      !camelCaseRegex.test(variableName) &&
      variableName !== file.split(".tsx").join("") &&
      !(filePath.includes("/Routes") && variableName.includes("Page"))
    ) {
      warnings.incorrectlyNamedStateVariables.push({
        file: filePath,
        error: variableName,
      });
    }
  });
}

function checkVariableNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  // CRITERIA: Variables should be camel case or upper snake case
  const variableRegex = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

  const variableNames = [];
  let match;

  while ((match = variableRegex.exec(data)) !== null) {
    variableNames.push(match[1]);
  }

  variableNames.forEach((variableName) => {
    if (
      !camelCaseRegex.test(variableName) &&
      !upperSnakeCaseRegex.test(variableName) &&
      variableName !== file.split(".tsx").join("") &&
      !(filePath.includes("/Routes") && variableName.includes("Page"))
    ) {
      warnings.incorrectlyNamedVariables.push({
        file: filePath,
        error: variableName,
      });
    }
  });
}

function checkShowModalNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  // CRITERIA: When naming state variables to show/hide modals, make use of const [modalToShow, setModalToShow] = useState<string>("") or const [shouldShowXModal, setShouldShowXModal] = useState<boolean>(false)
  const stateVariableRegex = /(?<=\[\s*)(\w+)(?=\s*,\s*set\w+\s*\])/gm;

  let match;

  const shouldShowXModalRegex = /^shouldShow[A-Z][a-zA-Z]*Modal$/;

  while ((match = stateVariableRegex.exec(data)) !== null) {
    let stateVariableName = match[1];
    if (
      stateVariableName.toLowerCase().includes("modal") &&
      !shouldShowXModalRegex.test(stateVariableName) &&
      stateVariableName !== "modalToShow"
    ) {
      warnings.incorrectlyNamedShowModalVariables.push({
        file: filePath,
        error: stateVariableName,
      });
    }
  }
}

function addRenderMethodsComment(data: string, filePath: string) {
  // CRITERIA: All components should have a comment indicating where the render methods section starts
  let renderMethodsCommentText = `/* --------------------------------*/
  /* RENDER METHODS */
  /* --------------------------------*/`;

  if (isComponentFile(data, filePath)) {
    if (data.indexOf("RENDER METHODS") === -1) {
      let firstRenderFunctionIndex = data.indexOf("function render");
      if (firstRenderFunctionIndex > -1) {
        const part1 = data.slice(0, firstRenderFunctionIndex);
        const part2 = data.slice(firstRenderFunctionIndex);
        data = part1 + renderMethodsCommentText + "\n" + "\n" + part2;
      }
    }
  }

  return data;
}

function fixLodashImports(data: string, filePath: string) {
  let importAll = 'import _ from "lodash";';
  if (data.includes(importAll)) {
    const lodashFunctionRegex = /_\.\w+[A-Za-z]*\(/g;
    const lodashFunctions = data.match(lodashFunctionRegex);
    let functionNames: string[] = [];
    lodashFunctions?.forEach((functionString: string) => {
      let functionName = functionString.substring(2, functionString.length - 1);
      functionNames.push(functionName);

      data = data.replace(functionString, functionName + "(");

      let newImport = `import ${functionName} from "lodash/${functionName}";`;
      if (!data.includes(newImport)) {
        // prevent newImport from being added multiple times
        data = data.replace(importAll, `${importAll}\n${newImport}`);
      }
    });

    data = data.replace(importAll, "");
  }

  return data;
}

function kebabToUpperCase(str: string) {
  // Split the string into individual words
  const words = str.split("-");

  // Capitalize each word (except the first one)
  const upperCamelCaseWords = words.map((word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // Join the words and return the upper camel case string
  return upperCamelCaseWords.join("");
}

function listMissingFontawesomeImports(data: string) {
  let regex = /icon="[^"]*"/g;

  let matches = data.match(regex);
  matches?.forEach((match: string) => {
    let iconString = match.replace('icon="', "").replace('"', "");
    let importName = "fa" + kebabToUpperCase(iconString);

    if (
      !allImportNames.includes(importName) &&
      !setupIconsContent.includes(importName)
    ) {
      errors.missingFontawesomeIconImports.push({
        error: `Missing import for ${importName}`,
      });
      allImportNames.push(importName);
    }
  });

  return data;
}

function makeCommentsSentenceCase(data: string) {
  // CRITERIA: All comments should be sentence case
  const singleLineCommentPattern = /\/\/(?!https?:\/\/).*$/gm;

  // const multiLineCommentPattern = /\/\*((?!\*\/|https?:\/\/)[\s\S])*?\*\//gm;

  // const commentPattern = new RegExp(
  //   `${singleLineCommentPattern.source}|${multiLineCommentPattern.source}`,
  //   "gm"
  // );

  const comments = data.match(singleLineCommentPattern);

  comments?.forEach((comment: string) => {
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

function checkForgottenTodos(data: string, filePath: string) {
  const regex = /\bTODO\b/gi;
  let matches = data.match(regex);
  if (matches) {
    warnings.forgottenTodos.push({ file: filePath });
  }
}

function logErrors(
  type: "error" | "warning",
  errorSectionName: string,
  errors: IErrorObject[]
) {
  let char = "-";
  writeOutput(type, char.repeat(errorSectionName.length));
  writeOutput(type, errorSectionName.toUpperCase());
  writeOutput(type, char.repeat(errorSectionName.length));

  errors.forEach((err) => {
    console.log(
      "\t" +
        (err.file ?? "") +
        (err.error && err.file ? " - " : "") +
        (err.error ? `${err.error}` : "")
    );
  });
}

async function getSetupIconsContent() {
  return new Promise((resolve, reject) => {
    let filePath = folderPath + "/setupIcons.ts";
    fs.readFile(filePath, "utf8", (err: any, data: string) => {
      if (err) {
        reject(`Error reading file: ${filePath}`);
      } else {
        setupIconsContent = data;
        resolve(true);
      }
    });
  });
}

async function run() {
  if (!args.folderPath) {
    writeOutput("error", "No path specified");
    return;
  }
  writeOutput("info", "Running code checker...");
  return getSetupIconsContent().then(async () => {
    return readTSXFilesRecursively(folderPath)
      .then(() => {
        let errorCount: number = 0;

        Object.keys(errors).forEach((key) => {
          // @ts-ignore
          let errorArray = errors[key];
          errorCount += errorArray?.length;

          errorArray.length > 0 &&
            logErrors("error", keyToHumanReadable(key), errorArray);
        });
        Object.keys(warnings).forEach((key) => {
          // @ts-ignore
          let warningArray = warnings[key];
          warningArray.length > 0 &&
            logErrors("warning", keyToHumanReadable(key), warningArray);
        });

        if (errorCount === 0) {
          writeOutput("info", "Done running code checker.");
          process.exit(0);
        } else {
          writeOutput("error", "Done running code checker.");
          process.exit(1);
        }
      })
      .catch((err) => {
        writeOutput("error", err);
        process.exit(1);
      });
  });
}

run();
