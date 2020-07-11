const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

mongoose.set('useCreateIndex', true);

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

authorSchema.virtual('bookCount', {
  ref: 'Book',
  localField: '_id',
  foreignField: 'author',
  count: true,
  // justOne: false,
});

module.exports = mongoose.model('Author', authorSchema);
