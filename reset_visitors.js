import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSLb2bAiHaYqfriuKpyzIXFKtAYrrZBvw",
  authDomain: "mhs1-dmc.firebaseapp.com",
  projectId: "mhs1-dmc",
  storageBucket: "mhs1-dmc.firebasestorage.app",
  messagingSenderId: "615145729605",
  appId: "1:615145729605:web:365a0db791798f2c057d2c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, 'ai-studio-mhs1bigdata-b097cba8-6fe0-43e2-ad20-e20681250b82');

async function run() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthStr = todayStr.slice(0, 7);
  const yearStr = todayStr.slice(0, 4);

  const docRef = doc(db, 'system_stats', 'visitor_count');
  await setDoc(docRef, {
    totalVisits: 0,
    todayVisits: 0,
    todayDate: todayStr,
    dailyVisits: {},
    monthlyVisits: {},
    yearlyVisits: {},
    updatedAt: new Date()
  });
  console.log("Successfully reset visitor counter in Firestore to 0!");
}

run().catch(console.error);
