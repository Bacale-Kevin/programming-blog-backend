const express = require("express");
const router = express.Router();
const { contactForm, contactBlogAuthorForm } = require("../controllers/form");

//? run validation contains de validation result that is return to the client
const { runValidation } = require("../validators");
const { contactFormValidator } = require("../validators/form");

//only admin will be able to create a new category
router.post("/contact", contactFormValidator, runValidation, contactForm);
router.post(
  "/contact-blog-author",
  contactFormValidator,
  runValidation,
  contactBlogAuthorForm
);

module.exports = router;
