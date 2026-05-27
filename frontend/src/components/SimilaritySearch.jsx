import { useState } from "react";
import { api } from "../api/api.js";

const defaultBody = JSON.stringify(
  {
    shape_id: "example-shape-id",
    limit: 5,
  },
  null,
  2
);

export default function SimilaritySearch() {
  const [bodyText, setBodyText] = useState(defaultBody);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch (err) {
      setError("Payload must be valid JSON");
      return;
    }

    if (!parsed.shape_id) {
      setError("Payload must include shape_id");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.search({
        shape_id: parsed.shape_id,
        limit: parsed.limit ?? parsed.k,
      });
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Search</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          rows="6"
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching..." : "GET /search/{shape_id}"}
        </button>
      </form>
      {result && (
        <pre style={{ background: "#0d1117", padding: "12px" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {error && <p style={{ color: "#ff8080" }}>{error}</p>}
    </section>
  );
}
