import { createRoot } from "react-dom/client";
import App from "./App";
import "./app/globals.css";

document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
