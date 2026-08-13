const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// ============================================
// Firebase Admin SDK
// ============================================
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to set FIREBASE_CONFIG environment variable with your service account JSON
// or use the default credential for Google Cloud environments
if (!admin.apps.length) {
  try {
    // Try to initialize with environment variable
    if (process.env.FIREBASE_CONFIG) {
      const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
    } else {
      // Fallback for local development - use default credentials
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    // For development, we can still run with in-memory fallback
    console.warn('⚠️ Running with in-memory fallback (development mode)');
  }
}

const db = admin.firestore();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-domain.vercel.app' : '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'assets', 'images', 'favicon.ico'));
});

// Serve logo
app.get('/logo', (req, res) => {
  res.redirect('https://i.postimg.cc/BbDyR0CR/lwjw.jpg');
});

// ==================================================
// API Routes
// ==================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================================================
// AUTH API Routes
// ==================================================

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'يرجى إدخال اسم المستخدم وكلمة المرور'
    });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: { username: ADMIN_USERNAME, role: 'admin' }
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'تم تسجيل الخروج' });
});

app.get('/api/auth/verify', (req, res) => {
  res.json({ 
    success: true, 
    user: { username: 'admin', role: 'admin' }
  });
});

// ==================================================
// Firebase Helper Functions
// ==================================================

// Helper to check if Firebase is available
const isFirebaseAvailable = () => {
  return admin.apps.length > 0 && db;
};

// Helper to get data from Firestore
async function getCollection(collectionName) {
  try {
    if (!isFirebaseAvailable()) {
      // Fallback to in-memory data
      return getInMemoryData(collectionName);
    }
    
    const snapshot = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
    const data = [];
    snapshot.forEach(doc => {
      data.push({ id: doc.id, ...doc.data() });
    });
    return data;
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return getInMemoryData(collectionName);
  }
}

// Helper to add data to Firestore
async function addToCollection(collectionName, data) {
  try {
    if (!isFirebaseAvailable()) {
      // Fallback to in-memory
      return addToInMemory(collectionName, data);
    }
    
    const docRef = await db.collection(collectionName).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const doc = await docRef.get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error adding to ${collectionName}:`, error);
    return addToInMemory(collectionName, data);
  }
}

// Helper to update data in Firestore
async function updateInCollection(collectionName, id, data) {
  try {
    if (!isFirebaseAvailable()) {
      return updateInMemory(collectionName, id, data);
    }
    
    await db.collection(collectionName).doc(id).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    const doc = await db.collection(collectionName).doc(id).get();
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error updating ${collectionName}:`, error);
    return updateInMemory(collectionName, id, data);
  }
}

// Helper to delete data from Firestore
async function deleteFromCollection(collectionName, id) {
  try {
    if (!isFirebaseAvailable()) {
      return deleteFromInMemory(collectionName, id);
    }
    
    await db.collection(collectionName).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error);
    return deleteFromInMemory(collectionName, id);
  }
}

// ==================================================
// In-Memory Fallback Data (for development)
// ==================================================

let inMemoryData = {
  masses: [
    { id: '1', day: 'الأحد', time: '٨:٠٠ ص – ١٠:٣٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس تيموثاؤس عزيز', createdAt: new Date().toISOString() },
    { id: '2', day: 'الإثنين', time: '٧:٠٠ ص – ٨:٣٠ ص', location: 'كنيسة السيدة العذراء', priest: 'أبونا القس أثناسيوس ونيس', createdAt: new Date().toISOString() },
    { id: '3', day: 'الثلاثاء', time: '٧:٠٠ ص – ٩:٠٠ ص', location: 'كنيسة السيدة العذراء', priest: 'أبونا القس أثناسيوس ونيس', createdAt: new Date().toISOString() },
    { id: '4', day: 'الأربعاء', time: '٧:٣٠ ص – ٩:٠٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس أرساني عبد المسيح', createdAt: new Date().toISOString() },
    { id: '5', day: 'الخميس', time: '٧:٣٠ ص – ٩:٣٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس أرساني عبد المسيح', createdAt: new Date().toISOString() },
    { id: '6', day: 'الجمعة', time: '٦:٠٠ ص – ٨:٠٠ ص', location: 'كنيسة الشهيد أبانوب', priest: 'أبونا القس بضابا سمير روفائيل', createdAt: new Date().toISOString() },
    { id: '7', day: 'السبت', time: '٨:٠٠ ص – ١٠:٠٠ ص', location: 'كنيسة الشهيد أبانوب', priest: 'أبونا القس جوارجيوس عبد الملاك', createdAt: new Date().toISOString() }
  ],
  services: [
    { id: '1', name: 'خدمة الشباب', description: 'لقاءات روحية واجتماعية للشباب', day: 'الجمعة', time: '٧:٠٠ م', createdAt: new Date().toISOString() },
    { id: '2', name: 'خدمة الأطفال', description: 'تعليم مسيحي وأنشطة للأطفال', day: 'السبت', time: '١٠:٠٠ ص', createdAt: new Date().toISOString() },
    { id: '3', name: 'اجتماعات روحية', description: 'اجتماعات روحية أسبوعية', day: 'الأربعاء', time: '٧:٠٠ م', createdAt: new Date().toISOString() }
  ],
  events: [
    { id: '1', title: 'مؤتمر الشباب السنوي', description: 'مؤتمر شبابي روحي', date: '١٥-١٧ مايو ٢٠٢٦', createdAt: new Date().toISOString() },
    { id: '2', title: 'رحلة العائلة المقدسة', description: 'رحلة روحانية', date: '٢٤-٢٦ يونيو ٢٠٢٦', createdAt: new Date().toISOString() }
  ],
  news: [],
  sermons: [],
  gallery: [],
  priests: [
    { id: '1', name: 'أبونا القس تيموثاؤس عزيز', title: 'كاهن الكنيسة', english: 'Fr. Timotheos Aziz', status: 'current', createdAt: new Date().toISOString() },
    { id: '2', name: 'أبونا القس أثناسيوس ونيس', title: 'كاهن الكنيسة', english: 'Fr. Athanasius Wanees', status: 'current', createdAt: new Date().toISOString() },
    { id: '3', name: 'أبونا القس أرساني عبد المسيح', title: 'كاهن الكنيسة', english: 'Fr. Arsani Abdelmasih', status: 'current', createdAt: new Date().toISOString() },
    { id: '4', name: 'أبونا القس بضابا سمير روفائيل', title: 'كاهن الكنيسة', english: 'Fr. Badaba Sameer Raphael', status: 'current', createdAt: new Date().toISOString() },
    { id: '5', name: 'أبونا القس جوارجيوس عبد الملاك', title: 'كاهن الكنيسة', english: 'Fr. Georgios Abdelmalak', status: 'current', createdAt: new Date().toISOString() }
  ],
  prayerRequests: [
    { id: '1', fullName: 'مريم فوزي', prayerRequest: 'صلاة من أجل الشفاء', isConfidential: false, date: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: '2', fullName: 'جورج واصف', prayerRequest: 'صلاة من أجل العائلة', isConfidential: true, date: new Date().toISOString(), createdAt: new Date().toISOString() }
  ],
  faq: [
    { id: '1', question: 'ما هي مواعيد القداسات في الكنيسة؟', answer: 'تقام القداسات الإلهية يومياً في الكنيسة. يمكنك الاطلاع على جدول القداسات الكامل في صفحة القداسات.', createdAt: new Date().toISOString() },
    { id: '2', question: 'كيف يمكنني التواصل مع الكنيسة؟', answer: 'يمكنك التواصل من خلال صفحة اتصل بنا، أو من خلال زيارة الكنيسة في العنوان: المنيرة، إمبابة، محافظة الجيزة.', createdAt: new Date().toISOString() },
    { id: '3', question: 'هل توجد خدمات للشباب والأطفال؟', answer: 'نعم، توجد خدمات متنوعة للشباب والأطفال تشمل لقاءات روحية وأنشطة ودروس تعليمية.', createdAt: new Date().toISOString() },
    { id: '4', question: 'كيف يمكنني تقديم طلب صلاة؟', answer: 'يمكنك تقديم طلب صلاة من خلال صفحة طلب صلاة المتاحة على الموقع، وسيتم عرض الطلبات للآباء الكهنة.', createdAt: new Date().toISOString() },
    { id: '5', question: 'ما هو موقع الكنيسة؟', answer: 'المنيرة، إمبابة، محافظة الجيزة، Plus Code: 36P3+974', createdAt: new Date().toISOString() }
  ]
};

function getInMemoryData(collectionName) {
  return inMemoryData[collectionName] || [];
}

function addToInMemory(collectionName, data) {
  const newItem = { 
    id: Date.now().toString(), 
    ...data, 
    createdAt: new Date().toISOString() 
  };
  if (!inMemoryData[collectionName]) {
    inMemoryData[collectionName] = [];
  }
  inMemoryData[collectionName].push(newItem);
  return newItem;
}

function updateInMemory(collectionName, id, data) {
  const items = inMemoryData[collectionName] || [];
  const index = items.findIndex(item => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...data, updatedAt: new Date().toISOString() };
  return items[index];
}

function deleteFromInMemory(collectionName, id) {
  const items = inMemoryData[collectionName] || [];
  inMemoryData[collectionName] = items.filter(item => item.id !== id);
  return { success: true };
}

// ==================================================
// CONTENT API Routes with Firebase
// ==================================================

// Get all content counts
app.get('/api/stats', async (req, res) => {
  try {
    const masses = await getCollection('masses');
    const services = await getCollection('services');
    const events = await getCollection('events');
    const news = await getCollection('news');
    const sermons = await getCollection('sermons');
    const gallery = await getCollection('gallery');
    const priests = await getCollection('priests');
    const prayerRequests = await getCollection('prayerRequests');
    const faq = await getCollection('faq');

    res.json({
      masses: masses.length,
      services: services.length,
      events: events.length,
      news: news.length,
      sermons: sermons.length,
      gallery: gallery.length,
      priests: priests.length,
      prayerRequests: prayerRequests.length,
      faq: faq.length
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Masses CRUD
// ==================================================

app.get('/api/masses', async (req, res) => {
  try {
    const data = await getCollection('masses');
    res.json(data);
  } catch (error) {
    console.error('Error getting masses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/masses', async (req, res) => {
  try {
    const newMass = await addToCollection('masses', req.body);
    res.json({ success: true, data: newMass });
  } catch (error) {
    console.error('Error adding mass:', error);
    res.status(500).json({ success: false, message: 'Failed to add mass' });
  }
});

app.put('/api/masses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('masses', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating mass:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/masses/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('masses', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting mass:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Services CRUD
// ==================================================

app.get('/api/services', async (req, res) => {
  try {
    const data = await getCollection('services');
    res.json(data);
  } catch (error) {
    console.error('Error getting services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const newService = await addToCollection('services', req.body);
    res.json({ success: true, data: newService });
  } catch (error) {
    console.error('Error adding service:', error);
    res.status(500).json({ success: false, message: 'Failed to add service' });
  }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('services', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('services', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Events CRUD
// ==================================================

app.get('/api/events', async (req, res) => {
  try {
    const data = await getCollection('events');
    res.json(data);
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const newEvent = await addToCollection('events', req.body);
    res.json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error adding event:', error);
    res.status(500).json({ success: false, message: 'Failed to add event' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('events', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('events', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// News CRUD
// ==================================================

app.get('/api/news', async (req, res) => {
  try {
    const data = await getCollection('news');
    res.json(data);
  } catch (error) {
    console.error('Error getting news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/news', async (req, res) => {
  try {
    const newNews = await addToCollection('news', { 
      ...req.body, 
      date: new Date().toISOString() 
    });
    res.json({ success: true, data: newNews });
  } catch (error) {
    console.error('Error adding news:', error);
    res.status(500).json({ success: false, message: 'Failed to add news' });
  }
});

app.put('/api/news/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('news', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/news/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('news', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Sermons CRUD
// ==================================================

app.get('/api/sermons', async (req, res) => {
  try {
    const data = await getCollection('sermons');
    res.json(data);
  } catch (error) {
    console.error('Error getting sermons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/sermons', async (req, res) => {
  try {
    const newSermon = await addToCollection('sermons', req.body);
    res.json({ success: true, data: newSermon });
  } catch (error) {
    console.error('Error adding sermon:', error);
    res.status(500).json({ success: false, message: 'Failed to add sermon' });
  }
});

app.put('/api/sermons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('sermons', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating sermon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/sermons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('sermons', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting sermon:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Gallery CRUD
// ==================================================

app.get('/api/gallery', async (req, res) => {
  try {
    const data = await getCollection('gallery');
    res.json(data);
  } catch (error) {
    console.error('Error getting gallery:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/gallery', async (req, res) => {
  try {
    const newAlbum = await addToCollection('gallery', { 
      ...req.body, 
      images: [] 
    });
    res.json({ success: true, data: newAlbum });
  } catch (error) {
    console.error('Error adding album:', error);
    res.status(500).json({ success: false, message: 'Failed to add album' });
  }
});

app.delete('/api/gallery/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('gallery', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Priests CRUD
// ==================================================

app.get('/api/priests', async (req, res) => {
  try {
    const data = await getCollection('priests');
    res.json(data);
  } catch (error) {
    console.error('Error getting priests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/priests', async (req, res) => {
  try {
    const newPriest = await addToCollection('priests', req.body);
    res.json({ success: true, data: newPriest });
  } catch (error) {
    console.error('Error adding priest:', error);
    res.status(500).json({ success: false, message: 'Failed to add priest' });
  }
});

app.put('/api/priests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('priests', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating priest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/priests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('priests', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting priest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Prayer Requests CRUD
// ==================================================

app.get('/api/prayer-requests', async (req, res) => {
  try {
    const data = await getCollection('prayerRequests');
    res.json(data);
  } catch (error) {
    console.error('Error getting prayer requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/prayer-requests', async (req, res) => {
  try {
    const newRequest = await addToCollection('prayerRequests', { 
      ...req.body, 
      date: new Date().toISOString() 
    });
    res.json({ success: true, data: newRequest });
  } catch (error) {
    console.error('Error adding prayer request:', error);
    res.status(500).json({ success: false, message: 'Failed to add prayer request' });
  }
});

app.put('/api/prayer-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('prayerRequests', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating prayer request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/prayer-requests/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('prayerRequests', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prayer request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// FAQ CRUD
// ==================================================

app.get('/api/faq', async (req, res) => {
  try {
    const data = await getCollection('faq');
    res.json(data);
  } catch (error) {
    console.error('Error getting faq:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/faq', async (req, res) => {
  try {
    const newFaq = await addToCollection('faq', req.body);
    res.json({ success: true, data: newFaq });
  } catch (error) {
    console.error('Error adding faq:', error);
    res.status(500).json({ success: false, message: 'Failed to add faq' });
  }
});

app.put('/api/faq/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateInCollection('faq', id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating faq:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/faq/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await deleteFromCollection('faq', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting faq:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================================================
// Catch-all route for SPA - must be after API routes
// ==================================================
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  const routeMap = {
    '/': 'index.html',
    '/login': 'login.html',
    '/dashboard': 'dashboard.html',
    '/church': 'church.html',
    '/masses': 'masses.html',
    '/services': 'services.html',
    '/events': 'events.html',
    '/news': 'news.html',
    '/sermons': 'sermons.html',
    '/gallery': 'gallery.html',
    '/priests': 'priests.html',
    '/saints': 'saints.html',
    '/faq': 'faq.html',
    '/search': 'search.html',
    '/prayer-request': 'prayer-request.html',
    '/contact': 'contact.html'
  };

  let cleanPath = req.path.replace(/\/+$/, '');
  if (cleanPath === '') cleanPath = '/';

  const file = routeMap[cleanPath];
  if (file) {
    res.sendFile(path.join(__dirname, 'public', file));
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Firebase Status: ${isFirebaseAvailable() ? '✅ Connected' : '⚠️ Using in-memory fallback'}`);
});

module.exports = app;
