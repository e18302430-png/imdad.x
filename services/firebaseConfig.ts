
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC5FMLYca--fPztr3SIhsQq6UgGIA723c4",
  authDomain: "imdad-b945b.firebaseapp.com",
  projectId: "imdad-b945b",
  storageBucket: "imdad-b945b.firebasestorage.app",
  messagingSenderId: "385420197112",
  appId: "1:385420197112:web:008f928d30f4991e4d4f0d",
  measurementId: "G-G6B02TBY9P"
};

let app;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  
  // فرض استخدام Long Polling وتعطيل الكشف التلقائي لضمان استقرار الاتصال
  // في بعض المتصفحات والشبكات التي تحظر WebSockets.
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false
  });
  
  console.log("✅ Firebase initialized with Forced Long Polling");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

export { app, db };
