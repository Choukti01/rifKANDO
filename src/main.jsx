import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import "./i18n";
import "./styles/globals.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const application = <App />;

ReactDOM.createRoot(document.getElementById("root")).render(
  googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>
    : application
);
