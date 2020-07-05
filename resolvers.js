const { UserInputError, AuthenticationError } = require('apollo-server');
const jwt = require('jsonwebtoken');
const Book = require('./models/book');
const Author = require('./models/author');
const User = require('./models/user');

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
    me: (root, args, context) => {
      return context.currentUser;
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
  Mutation: {
    addBook: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('Not authorized');
      }

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
    editAuthor: async (root, args, { currentUser }) => {
      if (!currentUser) {
        throw new AuthenticationError('Not authorized');
      }

      const author = await Author.findOne({ name: args.name });
      if (!author) {
        return null;
      }

      author.born = args.setBornTo;
      return author.save();
    },
    createUser: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (user) {
        throw new UserInputError('Sorry! Username is already taken.', {
          invalidArgs: args,
        });
      }

      const newUser = new User({ username: args.username, favoriteGenre: args.favoriteGenre });

      try {
        await newUser.save();
      } catch (error) {
        console.log('error: ', error.errors);

        if (error.errors['favoriteGenre'].kind) {
          throw new UserInputError('Favorite genre is required', {
            invalidArgs: args,
          });
        }

        switch (error.errors['username'].kind) {
          case 'minlength':
            throw new UserInputError('Title must be at least 3 characters long!', {
              invalidArgs: args,
            });
          default:
          case 'required':
            throw new UserInputError('Title is required!', {
              invalidArgs: args,
            });
        }
      }
      return newUser;
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== process.env.UNIV_PWD) {
        throw new UserInputError('Wrong Credential');
      }

      const userForToken = {
        username: args.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },
  },
};

module.exports = resolvers;
