import React from "react";
import AppLegacyPage from "./components/AppLegacyPage";
import { useAppLegacyState } from "./hooks/useAppLegacyState";

export default function App() {
  const state = useAppLegacyState();
  return <AppLegacyPage {...state} />;
}
