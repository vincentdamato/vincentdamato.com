import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Vincent D'Amato";
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 600 }}>Vincent D'Amato</h1>
        <p style={{ marginTop: "8px" }}>This site is under maintenance.</p>
      </div>
    </main>
  );
};

export default Index;
