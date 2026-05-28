const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { nickname, password, avatar } = req.body;
    const exists = await User.findOne({ nickname });
    if (exists) return res.status(400).json({ message: '이미 사용 중인 닉네임입니다.' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ nickname, password: hashed, avatar });
    const token = jwt.sign({ id: user._id, nickname: user.nickname }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, nickname: user.nickname, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { nickname, password } = req.body;
    const user = await User.findOne({ nickname });
    if (!user) return res.status(400).json({ message: '닉네임 또는 비밀번호가 틀렸습니다.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: '닉네임 또는 비밀번호가 틀렸습니다.' });

    const token = jwt.sign({ id: user._id, nickname: user.nickname }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, nickname: user.nickname, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: '서버 오류' });
  }
});

module.exports = router;
