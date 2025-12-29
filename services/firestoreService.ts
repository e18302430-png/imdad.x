
import { db } from './firebaseConfig';
import { collection, doc, getDoc, getDocs, setDoc, limit, query } from 'firebase/firestore'; 
import { AppData } from '../types';
import { initialData } from './dataService';

/**
 * دالة تنظيف البيانات لمنع خطأ Circular Structure بشكل جذري
 */
export const sanitizeItem = (item: any, seen = new WeakSet()): any => {
    if (item === null || item === undefined) return item;
    
    const type = typeof item;
    if (type !== 'object') return item;
    
    if (item instanceof Date) return item.toISOString();

    if (seen.has(item)) return undefined;
    
    // منع عناصر DOM التي تسبب مشاكل دائرية
    if (item instanceof HTMLElement || (item.nodeType && item.nodeName)) {
        return undefined;
    }

    // استثناء كائنات Firestore الداخلية
    if (item.constructor && item.constructor.name !== 'Object' && !Array.isArray(item)) {
        return undefined;
    }

    seen.add(item);
    
    if (Array.isArray(item)) {
        return item.map(i => sanitizeItem(i, seen)).filter(v => v !== undefined);
    }

    const newObj: any = {};
    for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
            const val = item[key];
            
            // حظر المراجع التي تسبب أخطاء دائرية معروفة
            if (
                key.startsWith('_') || 
                key === 'db' || 
                key === 'firestore' || 
                key === 'app' || 
                key === 'src' || 
                key === 'ownerDocument' ||
                typeof val === 'function'
            ) {
                continue;
            }
            
            const sanitizedVal = sanitizeItem(val, seen);
            if (sanitizedVal !== undefined) {
                newObj[key] = sanitizedVal;
            }
        }
    }
    return newObj;
};

export const firestoreService = {
  async checkConnection(): Promise<boolean> {
    if (!db) return false;
    try {
        const q = query(collection(db, "settings"), limit(1));
        await getDocs(q);
        return true;
    } catch (e) { return false; }
  },

  async saveItem(collectionName: string, item: any) {
    if(!db || !item.id) return;
    try {
      const cleanItem = sanitizeItem(item);
      if (cleanItem) {
        await setDoc(doc(db, collectionName, item.id.toString()), cleanItem);
      }
    } catch (error) { 
        console.error(`❌ Firestore Save Error (${collectionName}):`, error); 
    }
  },

  async loadAppData(): Promise<AppData | null> {
    if (!db) return null;
    try {
      const fetchColl = async (n: string) => {
        try {
            const s = await getDocs(collection(db, n));
            return s.docs.map(d => ({ 
                ...d.data(), 
                id: d.id.match(/^\d+$/) ? parseInt(d.id) : d.id 
            }));
        } catch (e) { return []; }
      };

      const [staff, delegates, requests, circulars, dailyReports] = await Promise.all([
        fetchColl('staff'), 
        fetchColl('delegates'), 
        fetchColl('requests'),
        fetchColl('circulars'), 
        fetchColl('dailyReports')
      ]);
      
      let settings = initialData.settings;
      try {
          const sSnap = await getDoc(doc(db, 'settings', 'global'));
          if (sSnap.exists()) settings = sSnap.data() as any;
      } catch (e) {}

      return { 
          staff: staff.length > 0 ? staff as any : initialData.staff, 
          delegates: delegates as any, 
          requests: requests as any, 
          circulars: circulars as any, 
          dailyReports: dailyReports as any, 
          settings 
      };
    } catch (error) { 
        console.error("❌ Critical loadAppData Error:", error);
        return null; 
    }
  }
};
