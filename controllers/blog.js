exports.time = (req, res) => {
  res.json({ time: Date().toString() });
};
//use to handle request containing file
const formidable = require("formidable");
const slugify = require("slugify");
const { htmlToText } = require("html-to-text");
//use to create excerpt out of the blog content remove all of the text out of the html and show it as the excerpt
const _ = require("lodash");

const Blog = require("../models/blog");
const Category = require("../models/category");
const Tag = require("../models/tag");
const User = require("../models/user");
const { errorHandler } = require("../helpers/dbErrorHandler");
const fs = require("fs");
const { smartTrim } = require("../helpers/blog");
const blog = require("../models/blog");

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  //keep extensions like jpeg png
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    //handle error
    if (err) {
      return res.status(400).json({ error: "Image could not upload" });
    }
    //handle fields
    const { title, body, categories, tags } = fields;

    if (!title || !title.length) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!body || body.length < 200) {
      return res.status(400).json({ error: "Content too short" });
    }

    if (!categories || categories.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one category is required" });
    }

    if (!tags || tags.length === 0) {
      return res.status(400).json({ error: "At least one tag is required" });
    }

    let blog = new Blog();

    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 520, " ", " ...");
    blog.slug = slugify(title).toLowerCase();
    blog.mtitle = `${title} | ${process.env.APP_NAME}`;
    //*****To be corrected */
    blog.mdesc = htmlToText(body.substring(0, 360), { wordwrap: 230 });
    // blog.mdesc = body.substring(0, 160);
    blog.postedBy = req.user._id;
    //categories and tags
    let arrayOfCategories = categories && categories.split(",");
    let arrayOfTags = tags && tags.split(",");

    //handle files
    if (files.photo) {
      if (files.photo.size > 10000000) {
        return res
          .status(400)
          .json({ error: "Image Should be less than 1MB of size" });
      }

      blog.photo.data = fs.readFileSync(files.photo.path);
      blog.photo.contentType = files.photo.type;
    }

    //save blog in DB
    blog.save((err, blog) => {
      if (err) {
        res.status(400).json({ error: errorHandler(err) });
      }

      //   res.json(blog);
      //* Find the blog base on its result ID and push the categories and tags to it
      //* So once the blog is saved it will be modified inorder to push the categories and tags in their fields
      Blog.findByIdAndUpdate(
        blog._id,
        { $push: { categories: arrayOfCategories } },
        { new: true }
      ).exec((err, data) => {
        if (err) {
          res.status(400).json({ error: errorHandler(err) });
        } else {
          Blog.findByIdAndUpdate(
            blog._id,
            { $push: { tags: arrayOfTags } },
            { new: true }
          ).exec((err, result) => {
            if (err) {
              res.status(400).json({ error: errorHandler(err) });
            }
            return res.json(result);
          });
        }
      });
    });
  });
};

exports.list = (req, res) => {
  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    //select the fields you want to show on the blog
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, blog) => {
      if (err) {
        return res.json({ error: errorHandler(err) });
      }
      return res.json(blog);
    });
};

exports.listAllBlogsCategoriesTags = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs;
  let categories;
  let tags;

  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username profile")
    //makes the created blogs to appear first
    .sort({ createdAt: -1 })
    /** Specifies the number of documents to skip. */
    .skip(skip)
    /** Specifies the maximum number of documents the query will return. */
    .limit(limit)
    //select the fields you want to show on the blog
    .select(
      "_id title slug excerpt categories tags postedBy createdAt updatedAt"
    )
    .exec((err, data) => {
      if (err) {
        return res.json({ error: errorHandler(err) });
      }
      blogs = data; //contains all the blogs
      //get all categories
      Category.find({}).exec((err, categories) => {
        if (err) {
          return res.json({ error: errorHandler(err) });
        }
        categories = categories; //cintains all the categories
        //get all tags
        Tag.find({}).exec((err, tags) => {
          if (err) {
            return res.json({ error: errorHandler(err) });
          }

          tags = tags;

          //return all blogs categories and tags
          res.json({ blogs, categories, tags, size: blogs.length });
        });
      });
    });
};

exports.read = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug })
    .select("-photo")
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("postedBy", "_id name username")
    // .select(
    //   "_id title body slug mtitle mdesc categories tags postedBy createdAt updatedAt"
    // )
    .exec((err, data) => {
      if (err) {
        return res.json({ error: err.message });
      } else if (!data) {
        return res.status(404).json({ error: "Blog not found!" });
      }
      return res.json(data);
    });
};

exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOneAndRemove({ slug }).exec((err, data) => {
    if (err) {
      return res.json({ error: errorHandler(err) });
    } else if (!data) {
      return res.status(404).json({ error: "Tag was not found" });
    }
    res.json({ message: "Blog deleted! successfully" });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug }).exec((err, oldBlog) => {
    if (err) {
      return res.json({ error: errorHandler(err) });
    }

    let form = new formidable.IncomingForm();
    //keep extensions like jpeg png
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      //handle error
      if (err) {
        return res.status(400).json({ error: "Image could not upload" });
      }
      //the slug does not changes even if the user updates the title this appraoch is good for SEO
      let slugBeforeMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      //making sure the slug doesn't change
      oldBlog.slug = slugBeforeMerge;

      const { body, desc, categories, tags } = fields;

      if (body) {
        oldBlog.excerpt = smartTrim(body, 320, "", " ...");
        oldBlog.desc = htmlToText(body.substring(0, 160), { wordwrap: null });
      }

      if (categories) {
        oldBlog.categories = categories.split(",");
      }

      if (tags) {
        oldBlog.tags = tags.split(",");
      }

      //handle files
      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res
            .status(400)
            .json({ error: "Image Should be less than 1MB of size" });
        }

        oldBlog.photo.data = fs.readFileSync(files.photo.path);
        oldBlog.photo.contentType = files.photo.type;
      }

      //save blog in DB
      oldBlog.save((err, blog) => {
        if (err) {
          console.log(err);
          res.status(400).json({ error: err.message });
        }
        blog.photo = undefined;
        res.json(blog);
      });
    });
  });
};

exports.photo = (req, res) => {
  const slug = req.params.slug;

  Blog.findOne({ slug })
    .select("photo")
    .exec((err, blog) => {
      if (err || !blog) {
        return res.status(400).json({ error: errorHandler(err) });
      }
      res.set("Content-Type", blog.photo.contentType);
      return res.send(blog.photo.data);
    });
};

exports.listRelated = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 3;

  //The blog itselft is send from the frontend
  //destructor the _id and categories from the blogs
  const { _id, categories } = req.body.blog;

  //find all other blogs sharing the same categories
  //$ne: Means not include
  //find all the id except this blog id and include the categories
  Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
    .limit(limit)
    .populate("postedBy", "_id name profile")
    .select("title slug excerpt postedBy createdAt updatedAt")
    .exec((err, blogs) => {
      if (err) {
        console.log(err);
        return res.status(400).json({ error: "Blogs not found" });
      }
      res.json(blogs);
      console.log(blogs);
    });
};

exports.listSearch = (req, res) => {
  const { search } = req.query;
  if (search) {
    //searching blog via title and body
    Blog.find(
      {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { body: { $regex: search, $options: "i" } },
        ],
      },
      (err, blogs) => {
        if (err) {
          res.status(400).json({ error: errorHandler(err) });
        }
        res.json(blogs);
      }
    ).select("-photo -body");
  }
};

// get blogs by the username
exports.listByUser = (req, res) => {
  let username = req.params.username;
  /**
   * finding first of all the user passed in the params, once the user found, make a
   * request to find the blogs of the specified user
   */
  User.findOne({ username }).exec((err, user) => {
    if (err) {
      return res.status(400).json({ error: errorHandler(err) });
    }
    //we can now use the id tom get the blogs
    let userId = user._id;
    Blog.find({ postedBy: userId })
      .populate("categories", "_id name slug")
      .populate("tags", "_id name slug")
      .populate("postedBy", "_id name username")
      .select("_id title slug postedBy createdAt updatedAt")
      .exec((err, data) => {
        if (err) {
          return res.status(400).json({ error: errorHandler(err) });
        }
        res.json(data);
      });
  });
};
