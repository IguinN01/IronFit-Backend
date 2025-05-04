import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

if (!fs.existsSync('firebase-service-account.json')) {
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountRaw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not set');
  }
  fs.writeFileSync('firebase-service-account.json', serviceAccountRaw);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve('firebase-service-account.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;