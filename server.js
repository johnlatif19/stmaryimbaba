const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

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
// CONTENT API Routes
// ==================================================

// Get all content counts
app.get('/api/stats', (req, res) => {
  res.json({
    masses: 4,
    services: 6,
    events: 2,
    news: 0,
    sermons: 0,
    gallery: 0,
    priests: 6,
    prayerRequests: 5,
    faq: 8
  });
});

// Masses CRUD
let masses = [
  { id: 1, day: 'الأحد', time: '٨:٠٠ ص – ١٠:٣٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس تيموثاؤس عزيز' },
  { id: 2, day: 'الإثنين', time: '٧:٠٠ ص – ٨:٣٠ ص', location: 'كنيسة السيدة العذراء', priest: 'أبونا القس أثناسيوس ونيس' },
  { id: 3, day: 'الثلاثاء', time: '٧:٠٠ ص – ٩:٠٠ ص', location: 'كنيسة السيدة العذراء', priest: 'أبونا القس أثناسيوس ونيس' },
  { id: 4, day: 'الأربعاء', time: '٧:٣٠ ص – ٩:٠٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس أرساني عبد المسيح' },
  { id: 5, day: 'الخميس', time: '٧:٣٠ ص – ٩:٣٠ ص', location: 'الكنيسة الرئيسية', priest: 'أبونا القس أرساني عبد المسيح' },
  { id: 6, day: 'الجمعة', time: '٦:٠٠ ص – ٨:٠٠ ص', location: 'كنيسة الشهيد أبانوب', priest: 'أبونا القس أنسطاسي ثابت' },
  { id: 7, day: 'السبت', time: '٨:٠٠ ص – ١٠:٠٠ ص', location: 'كنيسة الشهيد أبانوب', priest: 'أبونا القس أنسطاسي ثابت' }
];

app.get('/api/masses', (req, res) => {
  res.json(masses);
});

app.post('/api/masses', (req, res) => {
  const newMass = { id: Date.now(), ...req.body };
  masses.push(newMass);
  res.json({ success: true, data: newMass });
});

app.put('/api/masses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = masses.findIndex(m => m.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  masses[index] = { ...masses[index], ...req.body };
  res.json({ success: true, data: masses[index] });
});

app.delete('/api/masses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  masses = masses.filter(m => m.id !== id);
  res.json({ success: true });
});

// Services CRUD
let services = [
  { id: 1, name: 'خدمة الشباب', description: 'لقاءات روحية واجتماعية للشباب', day: 'الجمعة', time: '٧:٠٠ م' },
  { id: 2, name: 'خدمة الأطفال', description: 'تعليم مسيحي وأنشطة للأطفال', day: 'السبت', time: '١٠:٠٠ ص' },
  { id: 3, name: 'اجتماعات روحية', description: 'اجتماعات روحية أسبوعية', day: 'الأربعاء', time: '٧:٠٠ م' }
];

app.get('/api/services', (req, res) => {
  res.json(services);
});

app.post('/api/services', (req, res) => {
  const newService = { id: Date.now(), ...req.body };
  services.push(newService);
  res.json({ success: true, data: newService });
});

app.put('/api/services/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = services.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  services[index] = { ...services[index], ...req.body };
  res.json({ success: true, data: services[index] });
});

app.delete('/api/services/:id', (req, res) => {
  const id = parseInt(req.params.id);
  services = services.filter(s => s.id !== id);
  res.json({ success: true });
});

// Events CRUD
let events = [
  { id: 1, title: 'مؤتمر الشباب السنوي', description: 'مؤتمر شبابي روحي', date: '١٥-١٧ مايو ٢٠٢٦' },
  { id: 2, title: 'رحلة العائلة المقدسة', description: 'رحلة روحانية', date: '٢٤-٢٦ يونيو ٢٠٢٦' }
];

app.get('/api/events', (req, res) => {
  res.json(events);
});

app.post('/api/events', (req, res) => {
  const newEvent = { id: Date.now(), ...req.body };
  events.push(newEvent);
  res.json({ success: true, data: newEvent });
});

app.put('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = events.findIndex(e => e.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  events[index] = { ...events[index], ...req.body };
  res.json({ success: true, data: events[index] });
});

app.delete('/api/events/:id', (req, res) => {
  const id = parseInt(req.params.id);
  events = events.filter(e => e.id !== id);
  res.json({ success: true });
});

// News CRUD
let news = [];

app.get('/api/news', (req, res) => {
  res.json(news);
});

app.post('/api/news', (req, res) => {
  const newNews = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  news.push(newNews);
  res.json({ success: true, data: newNews });
});

app.put('/api/news/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = news.findIndex(n => n.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  news[index] = { ...news[index], ...req.body };
  res.json({ success: true, data: news[index] });
});

app.delete('/api/news/:id', (req, res) => {
  const id = parseInt(req.params.id);
  news = news.filter(n => n.id !== id);
  res.json({ success: true });
});

// Sermons CRUD
let sermons = [];

app.get('/api/sermons', (req, res) => {
  res.json(sermons);
});

app.post('/api/sermons', (req, res) => {
  const newSermon = { id: Date.now(), ...req.body };
  sermons.push(newSermon);
  res.json({ success: true, data: newSermon });
});

app.put('/api/sermons/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = sermons.findIndex(s => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  sermons[index] = { ...sermons[index], ...req.body };
  res.json({ success: true, data: sermons[index] });
});

app.delete('/api/sermons/:id', (req, res) => {
  const id = parseInt(req.params.id);
  sermons = sermons.filter(s => s.id !== id);
  res.json({ success: true });
});

// Gallery albums
let albums = [];

app.get('/api/gallery', (req, res) => {
  res.json(albums);
});

app.post('/api/gallery', (req, res) => {
  const newAlbum = { id: Date.now(), ...req.body, images: [] };
  albums.push(newAlbum);
  res.json({ success: true, data: newAlbum });
});

app.delete('/api/gallery/:id', (req, res) => {
  const id = parseInt(req.params.id);
  albums = albums.filter(a => a.id !== id);
  res.json({ success: true });
});

// Priests
let priests = [
  { id: 1, name: 'أبونا القس تيموثاؤس عزيز', title: 'كاهن الكنيسة', english: 'Fr. Timotheos Aziz', status: 'current' },
  { id: 2, name: 'أبونا القس أثناسيوس ونيس', title: 'كاهن الكنيسة', english: 'Fr. Athanasius Wanees', status: 'current' },
  { id: 3, name: 'أبونا القس أرساني عبد المسيح', title: 'كاهن الكنيسة', english: 'Fr. Arsani Abdelmasih', status: 'current' },
  { id: 4, name: 'أبونا القس أنسطاسي ثابت شحاته', title: 'كاهن الكنيسة', english: 'Fr. Anastasi Thabet', status: 'current' },
  { id: 5, name: 'أبونا القس بضابا سمير روفائيل', title: 'كاهن الكنيسة', english: 'Fr. Badaba Sameer', status: 'current' },
  { id: 6, name: 'أبونا القس جوارجيوس عبد الملاك', title: 'كاهن الكنيسة', english: 'Fr. Georgios Abdelmalak', status: 'current' }
];

app.get('/api/priests', (req, res) => {
  res.json(priests);
});

app.post('/api/priests', (req, res) => {
  const newPriest = { id: Date.now(), ...req.body };
  priests.push(newPriest);
  res.json({ success: true, data: newPriest });
});

app.put('/api/priests/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = priests.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  priests[index] = { ...priests[index], ...req.body };
  res.json({ success: true, data: priests[index] });
});

app.delete('/api/priests/:id', (req, res) => {
  const id = parseInt(req.params.id);
  priests = priests.filter(p => p.id !== id);
  res.json({ success: true });
});

// Prayer Requests
let prayerRequests = [
  { id: 1, fullName: 'مريم فوزي', prayerRequest: 'صلاة من أجل الشفاء', isConfidential: false, date: new Date().toISOString() },
  { id: 2, fullName: 'جورج واصف', prayerRequest: 'صلاة من أجل العائلة', isConfidential: true, date: new Date().toISOString() }
];

app.get('/api/prayer-requests', (req, res) => {
  res.json(prayerRequests);
});

app.post('/api/prayer-requests', (req, res) => {
  const newRequest = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  prayerRequests.push(newRequest);
  res.json({ success: true, data: newRequest });
});

app.put('/api/prayer-requests/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = prayerRequests.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  prayerRequests[index] = { ...prayerRequests[index], ...req.body };
  res.json({ success: true, data: prayerRequests[index] });
});

app.delete('/api/prayer-requests/:id', (req, res) => {
  const id = parseInt(req.params.id);
  prayerRequests = prayerRequests.filter(p => p.id !== id);
  res.json({ success: true });
});

// FAQ
let faqs = [
  { id: 1, question: 'ما هي مواعيد القداسات في الكنيسة؟', answer: 'تقام القداسات الإلهية يومياً في الكنيسة.' },
  { id: 2, question: 'كيف يمكنني التواصل مع الكنيسة؟', answer: 'يمكنك التواصل من خلال صفحة اتصل بنا.' },
  { id: 3, question: 'هل توجد خدمات للشباب والأطفال؟', answer: 'نعم، توجد خدمات متنوعة للشباب والأطفال.' },
  { id: 4, question: 'كيف يمكنني تقديم طلب صلاة؟', answer: 'يمكنك تقديم طلب صلاة من خلال صفحة طلب صلاة.' },
  { id: 5, question: 'ما هو موقع الكنيسة؟', answer: 'المنيرة، إمبابة، محافظة الجيزة، Plus Code: 36P3+974' }
];

app.get('/api/faq', (req, res) => {
  res.json(faqs);
});

app.post('/api/faq', (req, res) => {
  const newFaq = { id: Date.now(), ...req.body };
  faqs.push(newFaq);
  res.json({ success: true, data: newFaq });
});

app.put('/api/faq/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = faqs.findIndex(f => f.id === id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  faqs[index] = { ...faqs[index], ...req.body };
  res.json({ success: true, data: faqs[index] });
});

app.delete('/api/faq/:id', (req, res) => {
  const id = parseInt(req.params.id);
  faqs = faqs.filter(f => f.id !== id);
  res.json({ success: true });
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
});

module.exports = app;
