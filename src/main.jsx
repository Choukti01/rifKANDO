import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import { GOOGLE_CLIENT_ID } from "./config/googleAuth";
import "./i18n";
import "./styles/globals.css";
import "./styles/mobileUx.css";
import "./styles/brandPolish.css";
import "./styles/brandWaves.css";

const application = (
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  GOOGLE_CLIENT_ID
    ? <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{application}</GoogleOAuthProvider>
    : application
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch(() => {
      // The marketplace remains fully usable when browser installation support is unavailable.
    });
  });
}
