import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "@framer/plugin"
import App from "./App"
import "@framer/plugin/framer.css"
import "./App.css"

void framer.showUI({
  position: "top right",
  width: 400,
  height: 560,
  resizable: false,
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
