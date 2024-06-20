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
  missingPropTypes: IErrorObject[];
} = {
  filesMissingRenderFunction: [],
  incorrectlyNamedVariables: [],
  incorrectlyNamedStateVariables: [],
  incorrectlyNamedShowModalVariables: [],
  incorrectTruthy: [],
  classComponents: [],
  forgottenTodos: [],
  missingPropTypes: [],
};

let allImportNames: string[] = [];
let setupIconsContent: any;

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
          /* --------------------------------*/
          /* AUTOMATIC UPDATES               */
          /* --------------------------------*/
          data = replaceBracketPattern(data);
          data = addRenderMethodsComment(data, filePath);
          data = fixLodashImports(data, filePath);
          data = listMissingFontawesomeImports(data);
          data = fixIProps(data);
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
          checkIfPropsHaveType(data, file, filePath);
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
  try {
    // CRITERIA: Object string props should not have curly braces if no logical operations are performed on the string
    const regex = /={"([^+}]+)"}/g;

    data = data.replace(regex, '="$1"');
  } catch (e) {
    utils.writeOutput("error", `Could not replace bracket pattern: ${e}`);
  }
  return data;
}

function checkForRenderFunction(data: string, filePath: string) {
  try {
    // CRITERIA: All components should have a render function
    if (
      utils.isComponentFile(data, filePath) &&
      data.indexOf("function render()") === -1
    ) {
      warnings.filesMissingRenderFunction.push({ file: filePath });
    }
  } catch (e) {
    utils.writeOutput("error", `Could not check for render function: ${e}`);
  }
}
function checkForBooleanTruthyDetection(data: string, filePath: string) {
  try {
    // CRITERIA: Prefer boolean truthy detection Boolean(x) over double !!
    if (data.indexOf("!!") > -1) {
      warnings.incorrectTruthy.push({ file: filePath });
    }
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check for boolean truthy detection: ${e}`
    );
  }
}

function checkForClassComponent(data: string, filePath: string) {
  try {
    // CRITERIA: Make use of functional components instead of class components
    if (data.indexOf("extends Component") > -1) {
      warnings.classComponents.push({ file: filePath });
    }
  } catch (e) {
    utils.writeOutput("error", `Could not check for class component: ${e}`);
  }
}

function checkInterfaceNamingConventions(data: string, file: string) {
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
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check interface naming conventions: ${e}`
    );
  }
}

function checkComponentNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  try {
    if (filePath.indexOf("/pages") > -1) {
      // CRITERIA: Page component file name should follow the pattern <SomePageName>Page.tsx
      if (!namingConventionUtils.isValidPageComponentFileName(file)) {
        errors.incorrectComponentFileNames.push({ file });
      }
    } else if (filePath.indexOf("/components") > -1) {
      // CRITERIA: Component file name should follow the pattern <SomeComponentName>.tsx
      if (!namingConventionUtils.isValidComponentFileName(file)) {
        errors.incorrectComponentFileNames.push({ file });
      }
    }

    if (
      filePath.indexOf("/pages") > -1 ||
      filePath.indexOf("/components") > -1
    ) {
      // CRITERIA: Component name should be upper camel case
      let componentName = utils.getComponentName(data);
      if (componentName) {
        if (!namingConventionUtils.isValidComponentName(componentName)) {
          errors.incorrectComponentNames.push({ file, error: componentName });
        }
      } else {
        errors.incorrectComponentNames.push({
          file,
          error: "No component name found",
        });
      }
    }
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check component naming conventions: ${e}`
    );
  }
}

function checkIfPropsHaveType(data: string, file: string, filePath: string) {
  try {
    const componentName = utils.getComponentName(data);
    const propString = `${componentName}(props: any)`;
    if (data.indexOf(propString) > -1) {
      warnings.missingPropTypes.push({
        file,
        error: "No type definition for props (props: any)",
      });
    }
  } catch (e) {
    utils.writeOutput("error", `Could not check component prop type: ${e}`);
  }
}

function checkStateVariableNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  try {
    // CRITERIA: State variables should be camel case
    let variableNames: string[] = utils.getStateVariables(data);
    variableNames.forEach((variableName) => {
      if (
        !namingConventionUtils.isValidStateVariableName(variableName) &&
        variableName !== file.split(".tsx").join("") &&
        !(filePath.includes("/Routes") && variableName.includes("Page"))
      ) {
        warnings.incorrectlyNamedStateVariables.push({
          file: filePath,
          error: variableName,
        });
      }
    });
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check state variable naming conventions: ${e}`
    );
  }
}

function checkVariableNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  try {
    // CRITERIA: Variables should be camel case or upper snake case
    let variableNames: string[] = utils.getVariables(data);

    variableNames.forEach((variableName) => {
      if (
        !namingConventionUtils.isValidVariableName(variableName) &&
        variableName !== file.split(".tsx").join("") &&
        !(filePath.includes("/Routes") && variableName.includes("Page"))
      ) {
        warnings.incorrectlyNamedVariables.push({
          file: filePath,
          error: variableName,
        });
      }
    });
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check variable naming conventions: ${e}`
    );
  }
}

function checkShowModalNamingConventions(
  data: string,
  file: string,
  filePath: string
) {
  try {
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
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not check modal naming conventions: ${e}`
    );
  }
}

function addRenderMethodsComment(data: string, filePath: string) {
  try {
    // CRITERIA: All components should have a comment indicating where the render methods section starts
    if (utils.isComponentFile(data, filePath)) {
      data = commentUtils.addRenderMethodsComment(data);
    }
  } catch (e) {
    utils.writeOutput("error", `Could not add render methods comment: ${e}`);
  }

  return data;
}

function fixLodashImports(data: string, filePath: string) {
  try {
    data = importUtils.fixLodashImports(data);
  } catch (e) {
    utils.writeOutput("error", `Could not fix lodash imports: ${e}`);
  }

  return data;
}

function listMissingFontawesomeImports(data: string) {
  try {
    let importNames = utils.getFontawesomeImportNames(data);
    importNames?.forEach((importName: string) => {
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
  } catch (e) {
    utils.writeOutput(
      "error",
      `Could not list missing Fontawesome imports: ${e}`
    );
  }

  return data;
}

function fixIProps(data: string) {
  try {
    let componentName = utils.getComponentName(data);

    const regex = new RegExp(
      `function ${componentName}\\s*\\(props:\\s*\\{[\\n\\sa-zA-z?:;()|&=>,{}?]*}\\) {`,
      "m"
    );
    const match = data.match(regex);

    if (match) {
      let propsObject = match[0].trim();
      propsObject = propsObject
        .split(`function ${componentName}(props:`)
        .join("")
        .split(") {")
        .join("");

      const iProps = `interface IProps ${propsObject}\n\n`;
      let newData = data.replace(propsObject, "IProps");
      let functionIndex = data.indexOf(
        `export default function ${componentName}`
      );
      if (functionIndex === -1) {
        functionIndex = data.indexOf(`function ${componentName}`);
      }
      newData = utils.insertSubstring(newData, iProps, functionIndex);
      data = newData;
    }
  } catch (e) {
    utils.writeOutput("error", `Could not fix IProps: ${e}`);
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
  try {
    if (commentUtils.containsTodo(data)) {
      warnings.forgottenTodos.push({ file: filePath });
    }
  } catch (e) {
    utils.writeOutput("error", `Could not check forgotten todos: ${e}`);
  }
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
    utils.writeOutput("error", "No path specified");
    return;
  }
  utils.writeOutput("info", "Running code checker...");
  return getSetupIconsContent().then(async () => {
    return readTSXFilesRecursively(folderPath)
      .then(() => {
        let errorCount: number = 0;

        Object.keys(errors).forEach((key) => {
          // @ts-ignore
          let errorArray = errors[key];
          errorCount += errorArray?.length;

          errorArray.length > 0 &&
            utils.logErrors("error", utils.keyToHumanReadable(key), errorArray);
        });
        Object.keys(warnings).forEach((key) => {
          // @ts-ignore
          let warningArray = warnings[key];
          warningArray.length > 0 &&
            utils.logErrors(
              "warning",
              utils.keyToHumanReadable(key),
              warningArray
            );
        });

        if (errorCount === 0) {
          utils.writeOutput("info", "Done running code checker.");
          process.exit(0);
        } else {
          utils.writeOutput("error", "Done running code checker.");
          process.exit(1);
        }
      })
      .catch((err) => {
        utils.writeOutput("error", err);
        process.exit(1);
      });
  });
}

run();
