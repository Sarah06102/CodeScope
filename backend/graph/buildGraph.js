
// Build one combined graph from every parsed file in the repo
const buildGraph = (repositoryData) => {
  const { rootDir, files, errors } = repositoryData;
  const graph = {};

  // This currently keys nodes by function name, so duplicate names across files can collide
  files.forEach((parsedFile) => {
    parsedFile.functions.forEach((fn) => {
      // Each function becomes a graph node keyed by name
      graph[fn.name] = {
        id: fn.id,
        file: fn.file,
        location: fn.location,
        calls: fn.calls,
        calledBy: [],
      };
    });
  });

  // Fill in reverse relationships by checking who calls whom
  Object.keys(graph).forEach((functionName) => {
    // Use each function's outgoing calls to build a reverse caller relationship
    graph[functionName].calls.forEach((calledFn) => {
      if (graph[calledFn]) {
        graph[calledFn].calledBy.push(functionName);
      }
    });
  });

  // Store repo-level metadata so the graph knows where it came from
  graph._meta = {
    rootDir,
    fileCount: files.length,
    errors,
  };

  return graph;
};

module.exports = buildGraph;
