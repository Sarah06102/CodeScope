const fs = require("fs");
const path = require("path");

const parseFile = require("./parseFile");

// File types we want to analyze in the repo
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// Folders to skip when scanning
const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "build"]);


// Recursively walk through the repo and collect source files
const walkDirectory = (targetDir, files = []) => {

    // Read everything inside the current directory
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });

    entries.forEach((entry) => {
        // Build the full path for the current entry
        const fullPath = path.join(targetDir, entry.name);

        // If the entry is a folder, scan inside it too
        if (entry.isDirectory()) {
            // Skip folders we do not want to analyze
            if (!IGNORED_DIRECTORIES.has(entry.name)) {
                walkDirectory(fullPath, files);
            }
            return;
        }

        // If the entry is a file with a supported extension, keep it
        if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    });
    return files;
};


// Parse every supported file in the repo and keep track of any failures
const parseRepository = (rootDir) => {
    // Convert repo path into an absolute path 
    const absoluteRoot = path.resolve(rootDir);
    // Find every source file inside the repo
    const filePaths = walkDirectory(absoluteRoot);
    // Keep successful parses and failures seperate so one bad file does not stop the scan
    const files = [];
    const errors = [];

    filePaths.forEach((filePath) => {
        try {
            // Parse current file and store result
            files.push(parseFile(filePath, absoluteRoot));
        } catch (error) {
            // If parsing fails, save the error instead of crashing
            errors.push({
                file: path.relative(absoluteRoot, filePath),
                message: error.message,
            });
        }
    });
    
    return {
        rootDir: absoluteRoot,
        files,
        errors,
    };
};

module.exports = parseRepository;