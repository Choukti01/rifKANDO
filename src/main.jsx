import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { GOOGLE_CLIENT_ID } from "./config/googleAuth";
import "./i18n";
import "./styles/globals.css";

const application = <App />;

ReactDOM.createRoot(document.getElementById("root")).render(
  GOOGLE_CLIENT_ID
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{application}</GoogleOAuthProvider>
    : application
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The marketplace remains fully usable when browser installation support is unavailable.
    });
  });
}
