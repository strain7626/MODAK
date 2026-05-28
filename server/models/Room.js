const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  inviteCode: { type: String, default: () => uuidv4(), unique: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
