const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    minlength: 2,
  },
  born: {
    type: Number,
  },
});

module.exports = mongoose.model('Author', authorSchema);
