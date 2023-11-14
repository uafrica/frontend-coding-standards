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
  file: string;
  error?: any;
}

let errors: {
  incorrectInterfaceNames: IErrorObject[];
  incorrectInterfaceFileNames: IErrorObject[];
  incorrectComponentNames: IErrorObject[];
  incorrectComponentFileNames: IErrorObject[];
} = {
  incorrectInterfaceNames: [],
  incorrectInterfaceFileNames: [],
  incorrectComponentNames: [],
  incorrectComponentFileNames: [],
};
let warnings: {
  filesMissingRenderFunction: IErrorObject[];
  incorrectlyNamedVariables: IErrorObject[];
  incorrectTruthy: IErrorObject[];
  classComponents: IErrorObject[];
  forgottenTodos: IErrorObject[];
} = {
  filesMissingRenderFunction: [],
  incorrectlyNamedVariables: [],
  incorrectTruthy: [],
  classComponents: [],
  forgottenTodos: [],
};

const camelCaseRegex = /^[a-z][A-Za-z]*$/;
const upperCamelCaseRegex = /^[A-Z][A-Za-z]*$/;

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
          // data = makeCommentsSentenceCase(data); // todo needs more testing

          // Checks for files
          // checkVariableNamingConventions(data, filePath); // todo needs testing
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
    const pageComponentFileNamePattern = /^[A-Z][A-Za-z]*\Page\.tsx$/;

    if (!pageComponentFileNamePattern.test(file)) {
      errors.incorrectComponentFileNames.push({ file });
    }
  } else if (filePath.indexOf("/components") > -1) {
    // CRITERIA: Component file name should follow the pattern <SomeComponentName>.tsx
    const componentFileNamePattern = /^[A-Z][A-Za-z]*\.tsx$/;

    if (!componentFileNamePattern.test(file)) {
      errors.incorrectComponentFileNames.push({ file });
    }
  }

  if (filePath.indexOf("/pages") > -1 || filePath.indexOf("/components") > -1) {
    // CRITERIA: Component name should be upper camel case
    const componentNamePattern = /function\s+([a-zA-Z]*)\(/;
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

function checkVariableNamingConventions(data: string, filePath: string) {
  // CRITERIA: Variables should be camel case
  // Todo: needs work - some consts are SOME_CONSTANT
  const variableRegex = /\b(?:let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

  const variableNames = [];
  let match;

  while ((match = variableRegex.exec(data)) !== null) {
    variableNames.push(match[1]);
  }

  variableNames.forEach((variableName) => {
    if (!camelCaseRegex.test(variableName)) {
      warnings.incorrectlyNamedVariables.push({
        file: filePath,
        error: variableName,
      });
    }
  });
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
    console.log("\t" + err.file + (err.error ? ` - ${err.error}` : ""));
  });
}

async function run() {
  if (!args.folderPath) {
    writeOutput("error", "No path specified");
    return;
  }
  writeOutput("info", "Running code checker...");
  return readTSXFilesRecursively(folderPath)
    .then(() => {
      errors.incorrectInterfaceFileNames.length > 0 &&
        logErrors(
          "error",
          "Interface files named incorrectly",
          errors.incorrectInterfaceFileNames
        );

      errors.incorrectInterfaceNames.length > 0 &&
        logErrors(
          "error",
          "Interfaces named incorrectly",
          errors.incorrectInterfaceNames
        );

      errors.incorrectComponentFileNames.length > 0 &&
        logErrors(
          "error",
          "Component files named incorrectly",
          errors.incorrectComponentFileNames
        );

      errors.incorrectComponentNames.length > 0 &&
        logErrors(
          "error",
          "Components named incorrectly",
          errors.incorrectComponentNames
        );

      warnings.filesMissingRenderFunction.length > 0 &&
        logErrors(
          "warning",
          "Missing render function",
          warnings.filesMissingRenderFunction
        );

      warnings.incorrectlyNamedVariables.length > 0 &&
        logErrors(
          "warning",
          "Variables that are not camel case",
          warnings.incorrectlyNamedVariables
        );

      warnings.incorrectTruthy.length > 0 &&
        logErrors(
          "warning",
          "Prefer boolean truthy detection Boolean(x) over double !!",
          warnings.incorrectTruthy
        );
      warnings.classComponents.length > 0 &&
        logErrors(
          "warning",
          "Class components should be functional components",
          warnings.classComponents
        );

      warnings.forgottenTodos.length > 0 &&
        logErrors("warning", "Forgotten Todos", warnings.forgottenTodos);

      let errorCount: number = 0;
      Object.keys(errors).forEach((key) => {
        // @ts-ignore
        errorCount += errors[key]?.length;
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
}

run();
