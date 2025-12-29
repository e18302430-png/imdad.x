
import { db } from './firebaseConfig';
import { doc, writeBatch } from 'firebase/firestore';
import { initialData } from './dataService';

export const seedDatabase = async () => {
  if (!db) {
      console.error("Firestore not initialized. Check firebaseConfig.ts");
      throw new Error("Firestore not initialized");
  }
  
  console.log("Starting database seed...");

  try {
      const batch = writeBatch(db);

      // 1. Upload Staff
      initialData.staff.forEach(person => {
          const ref = doc(db, "staff", person.id.toString());
          batch.set(ref, person);
      });

      // 2. Upload Delegates
      initialData.delegates.forEach(delegate => {
          const ref = doc(db, "delegates", delegate.id.toString());
          batch.set(ref, delegate);
      });

      // 3. Upload Requests
      initialData.requests.forEach(request => {
          const ref = doc(db, "requests", request.id.toString());
          batch.set(ref, request);
      });

      // 4. Upload Circulars
      initialData.circulars.forEach(circular => {
          const ref = doc(db, "circulars", circular.id.toString());
          batch.set(ref, circular);
      });

      // 5. Upload Settings
      const settingsRef = doc(db, "settings", "global");
      batch.set(settingsRef, initialData.settings);
      
      // Commit all changes as a single transaction
      await batch.commit();
      
      console.log("Database seed completed successfully!");
      return true;
  } catch (error) {
      console.error("Error seeding database:", error);
      throw error;
  }
};
