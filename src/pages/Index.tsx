import { useEffect } from "react";
import Site from "@/site/Site";

const Index = () => {
  useEffect(() => {
    document.title = "Vincent D'Amato | Finance Automation";
  }, []);

  return <Site />;
};

export default Index;
