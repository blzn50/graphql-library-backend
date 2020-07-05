require('dotenv').config();
const { ApolloServer } = require('apollo-server');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/user');
const typeDefs = require('./schemas');
const resolvers = require('./resolvers');

mongoose.set('useFindAndModify', false);

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to Database...');
  })
  .catch((err) => {
    console.log('error connecting to db', err.message);
  });

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(auth.substring(7), process.env.JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
