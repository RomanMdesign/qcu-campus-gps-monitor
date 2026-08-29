// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD05eiqDp1IV6WXwo1x7sygKXZQ1DO0298",
  authDomain: "qcu-campus-gps.firebaseapp.com",
  databaseURL: "https://qcu-campus-gps-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "qcu-campus-gps",
  storageBucket: "qcu-campus-gps.firebasestorage.app",
  messagingSenderId: "541859224810",
  appId: "1:541859224810:web:3ea54da5f8e76993e98b93",
  measurementId: "G-D6G0D3K266"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
