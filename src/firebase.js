// src/firebase.js

import { initializeApp } from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";


// ======================================================
// FIREBASE CONFIGURATION
// ======================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,
};


// ======================================================
// CHECK CONFIGURATION
// ======================================================

const requiredFirebaseVariables = [
  ["VITE_FIREBASE_API_KEY", firebaseConfig.apiKey],
  ["VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
  ["VITE_FIREBASE_DATABASE_URL", firebaseConfig.databaseURL],
  ["VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
  [
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    firebaseConfig.messagingSenderId,
  ],
  ["VITE_FIREBASE_APP_ID", firebaseConfig.appId],
];

const missingFirebaseVariables =
  requiredFirebaseVariables
    .filter(([, value]) => !value)
    .map(([name]) => name);

if (missingFirebaseVariables.length > 0) {
  console.error(
    "Firebase configuration is incomplete. Missing:",
    missingFirebaseVariables
  );
}


// ======================================================
// INITIALIZE FIREBASE
// ======================================================

const app = initializeApp(firebaseConfig);


// ======================================================
// FIREBASE AUTHENTICATION
// ======================================================

export const auth = getAuth(app);


// ======================================================
// FIREBASE REALTIME DATABASE
// ======================================================

export const database = getDatabase(app);


// ======================================================
// EXPORT FIREBASE FUNCTIONS
// ======================================================

export {
  onAuthStateChanged,

  ref,
  set,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
};


// ======================================================
// DEFAULT EXPORT
// ======================================================

export default app;
