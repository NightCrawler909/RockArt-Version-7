import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Landing from "./Landing.jsx";
import ModelFlow from "./ModelFlow.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import DashboardHome from "./dashboard/DashboardHome.jsx";
import UploadPage from "./dashboard/UploadPage.jsx";
import EmbeddingsPage from "./dashboard/EmbeddingsPage.jsx";
import BatchLabelingPage from "./dashboard/BatchLabelingPage.jsx";
import SearchPage from "./dashboard/SearchPage.jsx";
import TrainModelPage from "./dashboard/TrainModelPage.jsx";
import PredictPage from "./dashboard/PredictPage.jsx";
import ExportPage from "./dashboard/ExportPage.jsx";
import SettingsPage from "./dashboard/SettingsPage.jsx";
import { PipelineProvider } from "../context/PipelineContext.jsx";

export default function App() {
  return (
    <PipelineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/model-flow" element={<ModelFlow />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<DashboardHome />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="segment" element={<EmbeddingsPage />} />
            <Route path="labeling" element={<BatchLabelingPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="train" element={<TrainModelPage />} />
            <Route path="predict" element={<PredictPage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </PipelineProvider>
  );
}
