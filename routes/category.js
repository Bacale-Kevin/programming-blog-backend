const express = require("express");
const router = express.Router();
const { create, list, read, remove } = require("../controllers/category");
const { requireSignin, adminMiddleware } = require("../controllers/auth");

//? run validation contains de validation result that is return to the client
const { runValidation } = require("../validators");
const {categoryCreateValidator} = require("../validators/category");


//only admin will be able to create a new category
router.post("/category", categoryCreateValidator, runValidation, requireSignin, adminMiddleware, create);
router.get('/categories', list)
router.get('/category/:slug', read)
router.delete('/category/:slug', requireSignin, adminMiddleware, remove)

module.exports = router;
