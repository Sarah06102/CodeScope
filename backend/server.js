const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const parseRepository = require("./parser/parseRepository");
const buildGraph = require("./graph/buildGraph");

// Build the repo graph once when the server starts
const projectRoot = path.resolve(__dirname, "..");
const repositoryData = parseRepository(projectRoot);

const graph = buildGraph(repositoryData);

console.log(`Parsed ${repositoryData.files.length} files`);

// Helper Functions

// Find a function in the graph by name
const findFunctionByName = (graph, functionName) => {
  return graph[functionName] || null;
};

// Return a small summary for one function
const summarizeFunction = (functionName, functionData) => {
  if (!functionData) {
    return null;
  }
  return {
    name: functionName,
    file: functionData.file,
    location: functionData.location,
    calls: functionData.calls,
    calledBy: functionData.calledBy,
  };
};

// Figure out what kind of question the user is asking
const interpretQuestion = (question) => {
  const normalized = question.trim();

  const callersMatch = normalized.match(/(?:what|who) calls ([A-Za-z0-9_$.]+)/i);
  if (callersMatch) {
    return { 
      type: "callers",
      target: callersMatch[1],
    };
  }

  const calleesMatch = normalized.match(/what does ([A-Za-z0-9_$.]+) call/i);
  if (calleesMatch) {
    return { 
      type: "callees",
      target: calleesMatch[1],
    };
  }
  return null;  
};

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/test", (req, res) => {
  res.json({ message: "API is working" });
});

app.get("/graph", (req, res) => {
  res.json(graph);
});

// Accept simple graph questions and return function relationship data
app.post("/query", (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  const interpreted = interpretQuestion(question);

  if (!interpreted) {
    return res.status(400).json({ error: "Unsupported query format" });
  }

  const functionData = findFunctionByName(graph, interpreted.target);

  if (!functionData) {
    return res.status(404).json({ error: `Function "${interpreted.target}" not found` });
  }

  if (interpreted.type === "callers") {
    return res.json({
      question,
      answer: `${interpreted.target} is called by ${functionData.calledBy.join(", ") || "no tracked functions"}`,
      result: summarizeFunction(interpreted.target, functionData),
    });
  }

  if (interpreted.type === "callees") {
    return res.json({
      question,
      answer: `${interpreted.target} calls ${functionData.calls.join(", ") || "no tracked functions"}`,
      result: summarizeFunction(interpreted.target, functionData),
    });
  }
  return res.status(400).json({ error: "Unsupported query type" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
