const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

// Convert absolute file paths into cleaner repo-relative paths
const getRelativeFilePath = (filePath, rootDir) => path.relative(rootDir, path.resolve(filePath)) || path.basename(filePath);

// Pull line numbers from AST nodes so results can point back to code
const getLocation = (node) => {
  if (!node?.loc) return null;
  
  return {
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
  };
};

// Turn a call expression like test() into a readable name
const getCalleeName = (callee) => {
  if (!callee) return null;

  if (callee.type === "Identifier") return callee.name;

  if (callee.type === "MemberExpression") {
    const objectName = getCalleeName(callee.object);
    const propertyName = getCalleeName(callee.property);

    if (objectName && propertyName) return `${objectName}.${propertyName}`;

    return objectName || propertyName;
  }

  return null;
};

// Collect all function calls made inside a function body
const collectCalls = (scopePath) => {
  const calls = [];

  scopePath.traverse({
    CallExpression(callPath) {
      const calleeName = getCalleeName(callPath.node.callee);

      if (calleeName) {
        calls.push(calleeName);
      }
    },
  });

  return calls;
};

// Parse one file and extract its imports and functions
const parseFile = (filePath, rootDir = process.cwd()) => {
  const absolutePath = path.resolve(filePath);
  const relativePath = getRelativeFilePath(absolutePath, rootDir);
  const code = fs.readFileSync(absolutePath, "utf-8");

  // Parse raw source code into a Babel AST so we can inspect code structure
  const ast = parser.parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx"],
  });


  const imports = [];
  const functions = [];

  // Walk the AST and collect the relevant node types
  traverse(ast, {
    // Track ES module imports used by this file
    ImportDeclaration(importPath) {
      imports.push({
        source: importPath.node.source.value,
        specifiers: importPath.node.specifiers.map((specifier) => {
          if (specifier.local?.name) return specifier.local.name;
          return "default";
        }),
        location: getLocation(importPath.node),
      });
    },

    // Track normal named function declarations
    FunctionDeclaration(functionPath) {
      const functionName = functionPath.node.id.name;
      const calls = collectCalls(functionPath);

      functions.push({
        id: `${relativePath}::${functionName}`,
        file: relativePath,
        name: functionName,
        location: getLocation(functionPath.node),
        calls,
      });
    },

    // Track functions assigned to variables, like arrow functions
    VariableDeclarator(variablePath) {
      const init = variablePath.node.init;
      const functionName = variablePath.node.id?.name;

      if (
        !functionName ||
        !init ||
        (init.type !== "ArrowFunctionExpression" && init.type !== "FunctionExpression")
      ) {
        return;
      }

      // Reuse the same call-collection logic for arrow/function expressions
      const calls = collectCalls(variablePath.get("init"));

      functions.push({
        id: `${relativePath}::${functionName}`,
        file: relativePath,
        name: functionName,
        location: getLocation(init),
        calls,
      });
    },
  });

  return { 
    file: relativePath,
    imports,
    functions,
  };
};

module.exports = parseFile;
