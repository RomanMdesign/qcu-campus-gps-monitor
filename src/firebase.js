import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const required = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId"
];

for (const key of required) {
  if (!firebaseConfig[key]) {
    console.error(`Missing Firebase configuration: ${key}`);
  }
}

export const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

export const auth = getAuth(app);

export async function signInGPSUser() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }

  return auth.currentUser;
}

export let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics is optional.
      // GPS should continue working even without Analytics.
    });
}
