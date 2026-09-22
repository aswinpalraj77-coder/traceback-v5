require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');
const rateLimit  = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

app.set('io', io);
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Rate limiters ──────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' }
});
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many OTP requests. Try again in 10 minutes.' }
});
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many reports filed. Please wait before submitting again.' }
});
const complaintLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many complaints submitted. Please try again later.' }
});
const scanLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { success: false, message: 'Scan rate limit exceeded.' }
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth/login',      authLimiter);
app.use('/api/auth/register',   authLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/cases',           reportLimiter);
app.use('/api/complaint',       complaintLimiter);
app.use('/api/facescan/alert',  scanLimiter);

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/cases',     require('./routes/cases'));
app.use('/api/facescan',  require('./routes/facescan'));
app.use('/api/complaint', require('./routes/complaint'));
app.use('/api/admin',     require('./routes/admin'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Socket.io ──────────────────────────────────────────────
io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ── MongoDB ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    server.listen(PORT, '0.0.0.0', () => {
      console.log('🚀  TraceBack v5 → http://localhost:' + PORT);
    });
  })
  .catch(err => { console.error('❌  MongoDB:', err.message); process.exit(1); });
