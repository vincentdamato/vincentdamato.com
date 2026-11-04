import { Suspense, lazy, useEffect } from "react";

// Three.js is large, so the office loads separately from the rest of the app.
const Site = lazy(() => import("@/site/Site"));

const Index = () => {
  useEffect(() => {
    document.title = "Vincent D'Amato | Finance Automation";
  }, []);

  return (
    <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#07130f" }} />}>
      <Site />
    </Suspense>
  );
};

export default Index;
