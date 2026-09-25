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
