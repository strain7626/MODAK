const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  avatar: {
    profileImage: { type: String, default: 'default' },
    feature1: { type: String, default: 'glasses' },  // 안경, 모자, 수염 등
    feature2: { type: String, default: 'none' },
  },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
