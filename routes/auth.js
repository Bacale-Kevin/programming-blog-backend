const express = require("express");
const router = express.Router();
const {
  signup,
  signin,
  signout,
  requireSignin,
  forgotPassword,
  resetPassword,
  preSignup,
  googleLogin
} = require("../controllers/auth");

//validations
const { runValidation } = require("../validators");
const {
  userSignupValidator,
  userSigninValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validators/auth");

router.post("/pre-signup", userSignupValidator, runValidation, preSignup);
router.post("/signup", signup);
router.post("/signin", userSigninValidator, runValidation, signin);
router.get("/signout", signout);

//test
//require sigin ensures the user have signin before accessing the route
router.get("/secret", requireSignin, (req, res) => {
  return res.json({ message: req.user });
});

router.put(
  "/forgot-password",
  forgotPasswordValidator,
  runValidation,
  forgotPassword
);
router.put(
  "/reset-password",
  resetPasswordValidator,
  runValidation,
  resetPassword
);

//google login
router.post("/google-login", googleLogin)

module.exports = router;
