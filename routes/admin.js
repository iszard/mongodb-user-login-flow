const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

router.get("/", (req, res, next) => {
  const user = req.user;
  if (user == null) {
    res.redirect("/");
    return;
  }

  if (user.isAdmin == false) {
    res.redirect("/");
    return;
  }

  Item.find(null)
    .then((items) => {
      const data = {
        user: user,
        items: items,
      };

      res.render("admin", data);
    })
    .catch((err) => {
      return next(err);
    });
});

router.post("/additem", (req, res, next) => {
  const user = req.user;
  if (user == null) {
    res.redirect("/");
    return;
  }

  if (user.isAdmin == false) {
    res.redirect("/");
    return;
  }

  Item.create(req.body)
    .then(() => {
      res.redirect("/admin");
    })
    .catch((err) => {
      next(err);
    });
});

module.exports = router;
