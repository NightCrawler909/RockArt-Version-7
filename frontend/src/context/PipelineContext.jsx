import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const PipelineContext = createContext(null);

const DEFAULT_PREFERENCES = {
  compactMode: false,
  motionEnabled: true,
  theme: "midnight",
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const hashSeed = (value) => {
  if (!value) {
    return 0;
  }
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export function PipelineProvider({ children }) {
  const [preferences, setPreferences] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES;
    }
    try {
      const stored = window.localStorage.getItem("rockart-preferences");
      return stored ? { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) } : DEFAULT_PREFERENCES;
    } catch (error) {
      console.warn("Failed to parse stored preferences", error);
      return DEFAULT_PREFERENCES;
    }
  });
  const [shapeIds, setShapeIds] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState("");
  const [embeddingsReady, setEmbeddingsReady] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [lastSearchMeta, setLastSearchMeta] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [shapeRegistry, setShapeRegistry] = useState({});
  const [segmentRuns, setSegmentRuns] = useState([]);
  const [embeddingRuns, setEmbeddingRuns] = useState([]);
  const [trainingRuns, setTrainingRuns] = useState([]);
  const [predictHistory, setPredictHistory] = useState([]);
  const [exportHistory, setExportHistory] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("rockart-preferences", JSON.stringify(preferences));
  }, [preferences]);

  const upsertShape = useCallback((shapeId, updates = {}) => {
    if (!shapeId) {
      return;
    }
    setShapeRegistry((prev) => {
      const next = { ...prev };
      const existing = next[shapeId] ?? { id: shapeId, label: "unlabeled" };
      next[shapeId] = {
        ...existing,
        ...updates,
        id: shapeId,
        previewSeed: existing.previewSeed ?? hashSeed(shapeId),
        updatedAt: new Date().toISOString(),
      };
      return next;
    });
  }, []);

  const registerShapes = useCallback(
    (incomingIds = []) => {
      if (!incomingIds.length) {
        return;
      }
      setShapeIds((prev) => {
        const merged = new Set(prev);
        incomingIds.forEach((id) => merged.add(id));
        return Array.from(merged);
      });
      incomingIds.forEach((id) => {
        upsertShape(id, {
          segmentationStatus: "complete",
          embeddingStatus: embeddingsReady ? "ready" : "pending",
        });
      });
    },
    [embeddingsReady, upsertShape]
  );

  const markEmbeddingComplete = useCallback(
    (ids = []) => {
      if (!ids.length) {
        return;
      }
      ids.forEach((id) => {
        upsertShape(id, { embeddingStatus: "ready" });
      });
      setEmbeddingsReady(true);
    },
    [upsertShape]
  );

  const assignLabel = useCallback(
    (shapeId, label, confidence = 1) => {
      if (!shapeId) {
        return;
      }
      upsertShape(shapeId, { label, confidence });
    },
    [upsertShape]
  );

  const assignLabelsBatch = useCallback(
    (updates = []) => {
      updates.forEach((item) => assignLabel(item.shape_id, item.label, item.confidence));
    },
    [assignLabel]
  );

  const addActivity = useCallback((entry) => {
    const enriched = {
      id: createId(),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setActivityLog((prev) => [enriched, ...prev].slice(0, 16));
  }, []);

  const recordSegmentRun = useCallback((payload) => {
    const entry = { id: createId(), timestamp: new Date().toISOString(), ...payload };
    setSegmentRuns((prev) => [entry, ...prev].slice(0, 6));
  }, []);

  const recordEmbeddingRun = useCallback((payload) => {
    const entry = { id: createId(), timestamp: new Date().toISOString(), ...payload };
    setEmbeddingRuns((prev) => [entry, ...prev].slice(0, 6));
  }, []);

  const recordTrainingRun = useCallback((payload) => {
    const entry = { id: createId(), timestamp: new Date().toISOString(), ...payload };
    setTrainingRuns((prev) => [entry, ...prev].slice(0, 5));
  }, []);

  const recordPredictEntry = useCallback((payload) => {
    const entry = { id: createId(), timestamp: new Date().toISOString(), ...payload };
    setPredictHistory((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const recordExportEntry = useCallback((payload) => {
    const entry = { id: createId(), timestamp: new Date().toISOString(), ...payload };
    setExportHistory((prev) => [entry, ...prev].slice(0, 8));
  }, []);

  const updatePreferences = useCallback((nextPrefs) => {
    setPreferences((prev) => ({ ...prev, ...nextPrefs }));
  }, []);

  const value = useMemo(
    () => ({
      shapeIds,
      setShapeIds,
      selectedShapeId,
      setSelectedShapeId,
      embeddingsReady,
      setEmbeddingsReady,
      searchResults,
      setSearchResults,
      lastSearchMeta,
      setLastSearchMeta,
      uploadSummary,
      setUploadSummary,
      shapeRegistry,
      registerShapes,
      upsertShape,
      markEmbeddingComplete,
      assignLabel,
      assignLabelsBatch,
      segmentRuns,
      embeddingRuns,
      trainingRuns,
      predictHistory,
      exportHistory,
      activityLog,
      addActivity,
      recordSegmentRun,
      recordEmbeddingRun,
      recordTrainingRun,
      recordPredictEntry,
      recordExportEntry,
      preferences,
      updatePreferences,
    }),
    [
      shapeIds,
      selectedShapeId,
      embeddingsReady,
      searchResults,
      lastSearchMeta,
      uploadSummary,
      shapeRegistry,
      registerShapes,
      markEmbeddingComplete,
      assignLabel,
      assignLabelsBatch,
      segmentRuns,
      embeddingRuns,
      trainingRuns,
      predictHistory,
      exportHistory,
      activityLog,
      preferences,
      addActivity,
      recordSegmentRun,
      recordEmbeddingRun,
      recordTrainingRun,
      recordPredictEntry,
      recordExportEntry,
      updatePreferences,
      upsertShape,
    ]
  );

  return <PipelineContext.Provider value={value}>{children}</PipelineContext.Provider>;
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error("usePipeline must be used within a PipelineProvider");
  }
  return context;
}
