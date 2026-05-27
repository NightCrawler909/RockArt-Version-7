export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, options);
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.detail ?? response.statusText;
    throw new Error(message || "Request failed");
  }

  return data;
};

export const api = {
  getHealth: () => request("/health"),

  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/upload/image", {
      method: "POST",
      body: formData,
    });
  },

  reprocessImage: (imagePath) =>
    request("/segment/reprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_path: imagePath }),
    }),

  search: ({ shape_id, limit }) => {
    if (!shape_id) {
      throw new Error("shape_id is required");
    }

    const params = new URLSearchParams();
    if (limit !== undefined) {
      params.set("k", String(limit));
    }

    const query = params.toString();
    const path = `/search/${encodeURIComponent(shape_id)}${
      query ? `?${query}` : ""
    }`;

    return request(path);
  },

  generateEmbeddings: () =>
    request("/search/refresh", {
      method: "POST",
    }),

  trainClassifier: () =>
    request("/train/classifier", {
      method: "POST",
    }),

  updateLabel: ({ shape_id, label, confidence = 1, user_id = "dashboard" }) =>
    request("/labels/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shape_id, label, confidence, user_id }),
    }),

  batchUpdateLabels: (updates) =>
    request("/labels/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    }),
};
