import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./styles/globals.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

if (!googleClientId) {
  throw new Error("VITE_GOOGLE_CLIENT_ID is required to use Google sign-in.");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider
      clientId={googleClientId}
    >
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
