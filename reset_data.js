import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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
  const querySnapshot = await getDocs(collection(db, "schools"));
  console.log(`Found ${querySnapshot.size} schools`);
  for (const docSnapshot of querySnapshot.docs) {
    await updateDoc(doc(db, "schools", docSnapshot.id), {
      director: "-",
      phone: "-",
      managerPhone: "-",
      directorPhone: "-",
      schoolPhone: "-",
      imageUrl: "",
      internetType: "none",
      electricity: false,
      staffCount: 0,
      majorSubjects: [],
      majorSubjectsWithStaff: []
    });
  }
  console.log("Done updating schools");
}

run().catch(console.error);
