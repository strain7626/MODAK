const router = require('express').Router();
const auth = require('../middleware/auth');
const Room = require('../models/Room');
const Message = require('../models/Message');
const User = require('../models/User');

// 내 채팅방 목록
router.get('/', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ members: req.user.id }).populate('members', 'nickname avatar');
    res.json(rooms);
  } catch {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅방 생성
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const room = await Room.create({ name, members: [req.user.id], createdBy: req.user.id });
    res.json(room);
  } catch {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 링크 초대 코드로 입장
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const room = await Room.findOne({ inviteCode: req.params.inviteCode });
    if (!room) return res.status(404).json({ message: '존재하지 않는 초대 코드입니다.' });

    if (!room.members.includes(req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }
    res.json(room);
  } catch {
    res.status(500).json({ message: '서버 오류' });
  }
});

// 채팅 히스토리 조회
router.get('/:roomId/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.roomId })
      .populate('sender', 'nickname avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
