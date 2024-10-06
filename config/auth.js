const LocalStrategy = require("passport-local").Strategy;
const User = require("../models/User");
const bcrypt = require("bcryptjs");

module.exports = (passport) => {
  passport.serializeUser((user, next) => {
    next(null, user);
  });

  passport.deserializeUser((id, next) => {
    User.findById(id)
      .then((user) => next(null, user))
      .catch((err) => next(err, null));
  });

  const LocalLogin = new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    (req, email, password, next) => {
      if (email == null) {
        email = "";
      }
      if (password == null) {
        password = "";
      }
      User.findOne({ email: email })
        .then((user) => {
          // check for user
          if (user == null) {
            return next(new Error("User Not Found"));
          }

          // check password
          if (bcrypt.compareSync(password, user.password) == false) {
            return next(new Error("Incorrect Password"));
          }

          return next(null, user);
        })
        .catch((err) => {
          return next(err);
        });
    }
  );

  passport.use("localLogin", LocalLogin);

  const localRegister = new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    (req, email, password, next) => {
      User.findOne({ email: email })
        .then((user) => {
          if (user != null) {
            return next(new Error("User already exists, please log in"));
          }

          // create the new user:
          const hashedPw = bcrypt.hashSync(password, 10);

          let isAdmin = false;
          if (email.indexOf("@outback.com") != -1) {
            isAdmin = true;
          }

          User.create({ email: email, password: hashedPw, isAdmin: isAdmin })
            .then((user) => {
              next(null, user);
            })
            .catch((err) => {
              return next(err);
            });
        })
        .catch((err) => {
          return next(err);
        });
    }
  );

  passport.use("localRegister", localRegister);
};
