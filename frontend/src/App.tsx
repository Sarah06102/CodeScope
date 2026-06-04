import { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3000";

type GraphMeta = {
  rootDir: string;
  fileCount: number;
  errors: Array<{
    file: string;
    message: string;
  }>;
};

type GraphNode = {
  id: string;
  file: string;
  location: {
    startLine: number;
    endLine: number;
  } | null;
  calls: string[];
  calledBy: string[];
};

type GraphData = {
  _meta: GraphMeta;
  [functionName: string]: GraphNode | GraphMeta;
};

type QueryResult = {
  question: string;
  answer: string;
  result: {
    name: string;
    file: string;
    location: {
      startLine: number;
      endLine: number;
    } | null;
    calls: string[];
    calledBy: string[];
  };
};

const App = () => {
  const [question, setQuestion] = useState("what calls parseFile");
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load graph metadata when the page first opens
  useEffect(() => {
    const loadGraph = async () => {
      try {
        const response = await fetch(`${API_BASE}/graph`);
        const data: GraphData = await response.json();
        setGraphData(data);
      } catch {
        setError("Failed to load graph data");
      }
    };

    loadGraph();
  }, []);

  // Send the user's question to the backend query endpoint
  const runQuery = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data: QueryResult | { error?: string } = await response.json();

      if (!response.ok) {
        setError("error" in data ? data.error || "Query failed" : "Query failed");
        setLoading(false);
        return;
      }

      if ("result" in data) {
        setResult(data);
      }
    } catch {
      setError("Failed to run query");
    } finally {
      setLoading(false);
    }
  };

  // Exclude graph metadata when counting tracked functions for the dashboard
  const functionCount = graphData
    ? Object.keys(graphData).filter((key) => key !== "_meta").length
    : 0;

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Codebase Knowledge Graph</p>
        <h1>Ask your codebase questions.</h1>
        <p className="subtitle">
          Explore function relationships, inspect dependencies, and trace what
          calls what across your repo.
        </p>
      </section>

      <section className="panel">
        <h2>Graph Overview</h2>
        <p>Tracked functions: {functionCount}</p>
        <p>Parsed files: {graphData?._meta?.fileCount ?? 0}</p>
      </section>

      <section className="panel">
        <h2>Ask a Question</h2>
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="what calls parseFile"
          className="question-input"
        />
        <button onClick={runQuery} disabled={loading} className="query-button">
          {loading ? "Running..." : "Run Query"}
        </button>

        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="panel">
        <h2>Result</h2>

        {!result && !error ? (
          <p>No query result yet.</p>
        ) : null}

        {/* Show the backend's answer + the raw function relationship details */}
        {result ? (
          <div className="result-card">
            <p><strong>Question:</strong> {result.question}</p>
            <p><strong>Answer:</strong> {result.answer}</p>
            <p><strong>Function:</strong> {result.result.name}</p>
            <p><strong>File:</strong> {result.result.file}</p>
            <p>
              <strong>Lines:</strong>{" "}
              {result.result.location
                ? `${result.result.location.startLine}-${result.result.location.endLine}`
                : "Unknown"}
            </p>
            <p><strong>Calls:</strong> {result.result.calls.join(", ") || "None"}</p>
            <p>
              <strong>Called By:</strong>{" "}
              {result.result.calledBy.join(", ") || "None"}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default App;