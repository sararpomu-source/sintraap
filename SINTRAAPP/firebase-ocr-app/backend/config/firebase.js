const admin = require('firebase-admin');

let db = null;
let bucket = null;
let firebaseReady = false;

try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const serviceAccount = require(serviceAccountPath);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket || undefined
  });

  db = admin.firestore();
  if (storageBucket) {
    bucket = admin.storage().bucket();
  }
  firebaseReady = true;
  console.log('✓ Firebase Admin SDK inicializado correctamente.');
} catch (error) {
  console.warn('⚠️  Firebase no configurado. Usando almacenamiento en memoria.');
  console.warn('    Para conectar Firebase, agrega serviceAccountKey.json y configura .env');
}

module.exports = { admin, db, bucket, firebaseReady };
