import React from "react";
import GlobalProviders from "./providers/GlobalProviders.jsx";
import RoutesConfig from "./routes/RoutesConfig.jsx";

export default function App() {
  return (
    <GlobalProviders>
      <RoutesConfig />
    </GlobalProviders>
  );
}