const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: true,
    minlength: 5,
  },
  born: {
    type: Number,
  },
});

authorSchema.plugin(uniqueValidator);

module.exports = mongoose.model('Author', authorSchema);
