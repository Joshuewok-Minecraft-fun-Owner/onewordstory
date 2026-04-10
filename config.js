// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCk5dlaIaaaJsrGnAEF-DVmD7pNlwPTtWg",
  authDomain: "one-word-story-maker.firebaseapp.com",
  databaseURL: "https://one-word-story-maker-default-rtdb.firebaseio.com",
  projectId: "one-word-story-maker",
  storageBucket: "one-word-story-maker.firebasestorage.app",
  messagingSenderId: "39207987212",
  appId: "1:39207987212:web:463df6121697a7e8bc2629",
  measurementId: "G-T8ZFB4Z0QE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
