const express = require("express");
const router = express.Router();
const { requireSignin, authMiddleware, adminMiddleware } = require("../controllers/auth");
const { read, publicProfile, update, photo } = require("../controllers/user");

//require sigin ensures the user have signin before accessing the route
//auth middleware ensures the user is availlable in the req.profile
//read simply return the users information
router.get("/user/profile", requireSignin, authMiddleware, read);
router.get("/user/:username", publicProfile);
router.put("/user/update", requireSignin, authMiddleware, update);
router.get("/user/photo/:username", photo);


module.exports = router;
