const express = require("express");
const router = express.Router();
const { create, list, read, remove } = require("../controllers/tag");
const { requireSignin, adminMiddleware } = require("../controllers/auth");

//? run validation contains de validation result that is return to the client
const { runValidation } = require("../validators");
const {tagCreateValidator} = require("../validators/tag");


//only admin will be able to create a new category
router.post("/tag", tagCreateValidator, runValidation, requireSignin, adminMiddleware, create);
router.get('/tags', list)
router.get('/tag/:slug', read)
router.delete('/tag/:slug', requireSignin, adminMiddleware, remove)

module.exports = router;
