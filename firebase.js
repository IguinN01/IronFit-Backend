import admin from "firebase-admin";
import serviceAccount from "./firebase-service-account.js";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;