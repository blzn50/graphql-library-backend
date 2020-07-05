require('dotenv').config();
const { ApolloServer, gql, UserInputError } = require('apollo-server');
const mongoose = require('mongoose');
const Book = require('./models/book');
const Author = require('./models/author');

mongoose.set('useFindAndModify', false);

console.log('process.env.MONGO_URI: ', process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to Database...');
  })
  .catch((err) => {
    console.log('error connecting to db', err.message);
  });

const typeDefs = gql`
  type Author {
    name: String!
    born: Int
    bookCount: Int
    id: ID!
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(title: String!, author: String!, published: Int!, genres: [String!]!): Book
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: (root, args) => {
      if (!args.author && !args.genre) {
        return books;
      } else if (args.author && !args.genre) {
        const byAuthor = (book) => args.author === book.author;
        return books.filter(byAuthor);
      } else if (!args.author && args.genre) {
        const byGenre = (book) => book.genres.includes(args.genre);
        return books.filter(byGenre);
      }
      const byAuthorAndGenre = (book) => {
        return book.author === args.author && book.genres.includes(args.genre);
      };
      return books.filter(byAuthorAndGenre);
    },
    allAuthors: () => {
      return Author.find({});
    },
  },
  Author: {
    bookCount: async (root) => {
      const books = await Book.find({}).populate('author');
      return books.reduce((acc, i) => {
        if (i.author.id === root.id) {
          acc++;
        }
        return acc++;
      }, 0);
    },
  },
  Book: {
    author: (root) => {
      console.log('root: ', root);
      return (root) => new Author(root);
    },
  },
  Mutation: {
    addBook: (root, args) => {
      if (books.find((b) => b.title === args.title)) {
        throw new UserInputError('Title must be unique', {
          invalidArgs: args.title,
        });
      }

      const book = { ...args, id: uuid() };
      books = books.concat(book);

      if (!authors.includes(book.author)) {
        authors = authors.concat({ name: args.author, id: uuid() });
      }

      return book;
    },
    editAuthor: (root, args) => {
      const author = authors.find((a) => a.name === args.name);
      if (!author) {
        return null;
      }

      const updatedAuthor = { ...author, born: args.setBornTo };
      authors = authors.map((a) => (a.name === args.name ? updatedAuthor : a));
      return updatedAuthor;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
