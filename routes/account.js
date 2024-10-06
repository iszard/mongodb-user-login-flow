const express = require("express");
const router = express.Router();
const Mailgun = require("mailgun-js");
const bcrypt = require("bcryptjs");
const Item = require("../models/Item");
const User = require("../models/User");

const sensitive = require("../sensitive.json");
require("dotenv").config();

const randomString = (length) => {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

router.get("/", (req, res, next) => {
  const user = req.user;
  if (user == null) {
    res.redirect("/");
    return;
  }

  Item.find(null)
    .then((items) => {
      Item.find({ interested: user._id })
        .then((interestedItems) => {
          const data = {
            user: user,
            items: items,
            interested: interestedItems,
          };

          res.render("account", data);
        })
        .catch((err) => {
          next(err);
        });
    })
    .catch((err) => {
      next(err);
    });
});

router.get("/additem/:itemid", (req, res, next) => {
  const user = req.user;
  if (user == null) {
    res.redirect("/");
    return;
  }

  Item.findById(req.params.itemid)
    .then((item) => {
      if (item.interested.indexOf(user._id) == -1) {
        item.interested.push(user._id);
        item.save();
        res.redirect("/account");
      }
    })
    .catch((err) => {
      next(err);
    });
});

router.get("/removeitem/:itemid", (req, res, next) => {
  const user = req.user;
  if (user == null) {
    res.redirect("/");
    return;
  }

  Item.findById(req.params.itemid)
    .then((item) => {
      var index = item.interested.indexOf(user._id);
      if (index > -1) {
        item.interested.splice(index, 1);
        item.save();
      }
      res.redirect("/account");
    })
    .catch((err) => {
      next(err);
    });
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

router.post("/resetpassword", (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      // check for user
      if (user != null) {
        user.nonce = randomString(8);
        user.passwordResetTime = Date.now();
        user.save();

        const mailgun = Mailgun({
          apiKey: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN,
        });

        const data = {
          to: req.body.email,
          from: process.env.MAILGUN_SENDER,
          sender: "Sample Store",
          subject: "Password Rest Request",
          html: `Please click <a style="color:red" href="http://localhost:5000/account/password-reset?nonce=${user.nonce}&id=${user._id}">HERE</a> to reset your password. This link is valid for 24 hours.`,
        };

        mailgun
          .messages()
          .send(data)
          .then((body) => {
            res.json({
              confirmation: "success",
              data: "reset password endpoint",
              user: user,
            });
          })
          .catch((err) => {
            next(err);
          });
      }
    })
    .catch((err) => {
      next(err);
    });
});

router.get("/password-reset", (req, res, next) => {
  const nonce = req.query.nonce;
  const user_id = req.query.id;
  if (nonce == null || nonce == "" || user_id == null || user_id == "") {
    return next(new Error("Invalid Request"));
  }

  User.findById(user_id)
    .then((user) => {
      if (user.passwordResetTime == null) {
        return next(new Error("Invalid Request"));
      }

      if (user.nonce == null) {
        return next(new Error("Invalid Request"));
      }

      if (nonce != user.nonce) {
        return next(new Error("Invalid Request"));
      }

      const now = new Date();
      const diff = now - user.passwordResetTime; // time in milliseconds
      const seconds = diff / 1000;

      if (seconds > 24 * 60 * 60) {
        return next(new Error("Invalid Request"));
      }

      const data = {
        id: user._id,
        nonce: nonce,
      };

      res.render("password-reset", data);
    })
    .catch((err) => {
      next(err);
    });
});

router.post("/newpassword", (req, res, next) => {
  const password1 = req.body.password1;
  if (password1 == null) {
    return next(new Error("Invalid Request"));
  }
  const password2 = req.body.password2;
  if (password2 == null) {
    return next(new Error("Invalid Request"));
  }
  const nonce = req.body.nonce;
  if (nonce == null) {
    return next(new Error("Invalid Request"));
  }
  const user_id = req.body.id;
  if (user_id == null) {
    return next(new Error("Invalid Request"));
  }

  if (password1 != password2) {
    return next(new Error("Password do not match"));
  }

  User.findById(user_id)
    .then((user) => {
      if (user.passwordResetTime == null) {
        return next(new Error("Invalid Request"));
      }

      if (user.nonce == null) {
        return next(new Error("Invalid Request"));
      }

      if (nonce != user.nonce) {
        return next(new Error("Invalid Request"));
      }

      const now = new Date();
      const diff = now - user.passwordResetTime; // time in milliseconds
      const seconds = diff / 1000;

      if (seconds > 24 * 60 * 60) {
        return next(new Error("Invalid Request"));
      }

      const hashedPw = bcrypt.hashSync(password1, 10);
      user.password = hashedPw;
      user.save();

      res.redirect("/");
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
