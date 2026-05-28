require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));

// roomId → Set of { userId, nickname, avatar, socketId }
const roomPresence = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('인증 실패'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    socket.currentRoom = roomId;

    if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
    roomPresence.get(roomId).set(socket.id, {
      userId: socket.user.id,
      nickname: socket.user.nickname,
      socketId: socket.id,
    });

    io.to(roomId).emit('presence_update', [...roomPresence.get(roomId).values()]);
  });

  socket.on('send_message', async ({ roomId, content }) => {
    try {
      const message = await Message.create({
        room: roomId,
        sender: socket.user.id,
        content,
      });
      const populated = await message.populate('sender', 'nickname avatar');

      io.to(roomId).emit('new_message', populated);
    } catch (err) {
      socket.emit('error', '메시지 전송 실패');
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.currentRoom;
    if (roomId && roomPresence.has(roomId)) {
      roomPresence.get(roomId).delete(socket.id);
      io.to(roomId).emit('presence_update', [...roomPresence.get(roomId).values()]);
    }
  });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
    server.listen(process.env.PORT, () => console.log(`서버 실행 중: http://localhost:${process.env.PORT}`));
  })
  .catch(err => console.error('MongoDB 연결 실패:', err));
