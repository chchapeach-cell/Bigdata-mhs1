import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const newConfig = {
  apiKey: "AIzaSyBSLb2bAiHaYqfriuKpyzIXFKtAYrrZBvw",
  authDomain: "mhs1-dmc.firebaseapp.com",
  projectId: "mhs1-dmc"
};

const appNew = initializeApp(newConfig, 'new');
const dbNew = getFirestore(appNew, 'ai-studio-mhs1bigdata-b097cba8-6fe0-43e2-ad20-e20681250b82');

async function run() {
  console.log("Writing to random collection...");
  try {
    await setDoc(doc(dbNew, 'random_test', 'test_doc'), {
      hello: 'world'
    });
    console.log("Success random!");
  } catch (err) {
    console.error("Error random:", err);
  }
  process.exit(0);
}
run();
