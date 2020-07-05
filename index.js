require('dotenv').config();
const { ApolloServer, gql, UserInputError } = require('apollo-server');
const mongoose = require('mongoose');
const Book = require('./models/book');
const Author = require('./models/author');

mongoose.set('useFindAndModify', false);

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
        return Book.find({}).populate('author');
      } else if (args.author && !args.genre) {
        const byAuthor = (book) => args.author === book.author;
        return books.filter(byAuthor);
      } else if (!args.author && args.genre) {
        return Book.find({ genres: { $in: [args.genre] } }).populate('author');
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
  // Book: {
  //   author: async ({author}) => {
  //     console.log('root: ', root);
  //     return (root) => new Author(root.author);
  //   },
  // },
  Mutation: {
    addBook: async (root, args) => {
      const book = await Book.findOne({ title: args.title });

      if (book) {
        throw new UserInputError('Title must be unique', {
          invalidArgs: args.title,
        });
      }

      const author = await Author.findOne({ name: args.author });
      let newAuthor;
      let newBook;

      if (!author) {
        newAuthor = new Author({ name: args.author });

        try {
          await newAuthor.save();
        } catch (error) {
          switch (error.errors['name'].kind) {
            case 'minlength':
              throw new UserInputError('Name must be at least 5 characters long!', {
                invalidArgs: args,
              });
            default:
            case 'required':
              throw new UserInputError('Name is required!', {
                invalidArgs: args,
              });
          }
        }
        return newAuthor;
      }

      if (newAuthor) {
        newBook = new Book({ ...args, author: newAuthor._id });
      } else {
        newBook = new Book({ ...args, author: author._id });
      }

      try {
        await newBook.save();
      } catch (error) {
        switch (error.errors['title'].kind) {
          case 'minlength':
            throw new UserInputError('Title must be at least 2 characters long!', {
              invalidArgs: args,
            });
          default:
          case 'required':
            throw new UserInputError('Title is required!', {
              invalidArgs: args,
            });
        }
      }
      return newBook;
    },
    editAuthor: async (root, args) => {
      const author = await Author.findOne({ name: args.name });
      if (!author) {
        return null;
      }

      author.born = args.setBornTo;
      return author.save();
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
