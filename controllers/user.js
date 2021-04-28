const User = require("../models/user");
const Blog = require("../models/blog");
const _ = require("lodash");
const formidable = require("formidable");
const fs = require("fs");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

//* publicProfile does not only return the user but also all the blogs been created by the user
exports.publicProfile = (req, res) => {
  let username = req.params.username;

  let user;
  let blogs;

  User.findOne({ username }).exec((err, userFromDb) => {
    if (err || !userFromDb) {
      return res.status(400).json({ error: "User not found" });
    }

    user = userFromDb;
    let userId = user._id;

    Blog.find({ postedBy: userId })
      .populate("categories", "_id name slug")
      .populate("tags", "_id name slug")
      .populate("postedBy", "_id name ")
      //limit the search to not more than 10
      .limit(10)
      .select(
        "_id title slug excerpt, categories tags postedBy createdAt updatedAt"
      )
      .exec((err, data) => {
        if (err || !data) {
          console.log(err);
          return res.status(400).json({ error: errorHandler(err) });
        }
        user.photo = undefined;
        user.hashed_password = undefined;
        console.log({ data });
        res.json({ user, blogs: data });
      });
  });
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtension = true;
  form.parse(req, (err, fields, files) => {
    if (err) {
      return res.status(400).json({ error: "Photo could not be uploaded" });
    }
    //grabbing the logged in user
    let user = req.profile;

    user = _.extend(user, fields);

    if (fields.password && fields.password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password should be min 6 characters long" });
    }

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res.status(400).json({ error: "Image should be less than 1MB" });
      }
      user.photo.data = fs.readFileSync(files.photo.path);
      user.photo.contentType = files.photo.type;
    }
    user.save((err, result) => {
      if (err) {
        return res.status(400).json({ error: errorHandler(err) });
      }

      user.hashed_password = undefined;
      user.salt = undefined
      user.photo = undefined
      res.json(user);
    });
  });
};

exports.photo = (req, res) => {
  const username = req.params.username;
  User.findOne({ username }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "User not found" });
    }
    console.log({ user });
    if (user.photo.data) {
      res.set("Content-Type", user.photo.contentType);
      return res.send(user.photo.data);
    }
  });
};
