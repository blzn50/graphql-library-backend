const { UserInputError, AuthenticationError, PubSub } = require('apollo-server');
const jwt = require('jsonwebtoken');
const Book = require('./models/book');
const Author = require('./models/author');
const User = require('./models/user');

const pubsub = new PubSub();

const bookAddingHelper = async (book, args, author) => {
  const newBookToAdd = new book({ ...args, author: author._id });
  try {
    await newBookToAdd.save();
    newBookToAdd.author = author;
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
  return newBookToAdd;
};

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allGenres: async () => {
      const books = await Book.find({});
      let allGenres = [];

      books.forEach((b) => {
        allGenres = allGenres.concat(...b.genres, 'all');
      });

      return [...new Set(allGenres)];
    },
    allBooks: (root, args) => {
      if (!args.author && !args.genre) {
        return Book.find({}).populate({ path: 'author', populate: 'bookCount' });
      } else if (args.author && !args.genre) {
        const byAuthor = (book) => args.author === book.author;
        return books.filter(byAuthor);
      } else if (!args.author && args.genre) {
        if (args.genre === 'all') {
          return Book.find({}).populate('author');
        }
        return Book.find({ genres: { $in: [args.genre] } }).populate({
          path: 'author',
          populate: 'bookCount',
        });
      }
      const byAuthorAndGenre = (book) => {
        return book.author === args.author && book.genres.includes(args.genre);
      };
      return books.filter(byAuthorAndGenre);
    },
    allAuthors: async (_, __, ___, info) => {
      // const bookCountNode = info.fieldNodes[0].selectionSet.selections;
      // if(bookCount.includes)
      const authors = await Author.find({}).populate('bookCount');
      return authors;
    },
    me: (root, args, context) => {
      return context.currentUser;
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

      if (!book && (!args.title || !args.author || !args.published || args.genres.length === 0)) {
        throw new UserInputError('Please fill all the values of the book', {
          invalidArgs: args,
        });
      }

      const author = await Author.findOne({ name: args.author }).populate('bookCount');
      let newBook;

      if (!author) {
        const newAuthor = new Author({ name: args.author });

        try {
          await newAuthor.save();
          newAuthor.populate('bookCount');
          newBook = await bookAddingHelper(Book, args, newAuthor);
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
      } else {
        newBook = await bookAddingHelper(Book, args, author);
      }

      pubsub.publish('BOOK_ADDED', { bookAdded: newBook });

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
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED']),
    },
  },
};

module.exports = resolvers;
