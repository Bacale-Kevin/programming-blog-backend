const User = require("../models/user");
const Blog = require("../models/blog");
const shortId = require("shortid");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const sgMail = require("@sendgrid/mail");
const _ = require("lodash");
const { OAuth2Client } = require("google-auth-library");
const { errorHandler } = require("../helpers/dbErrorHandler");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.preSignup = (req, res) => {
  const { name, email, password } = req.body;

  User.findOne({ email: email.toLowerCase() }, (err, user) => {
    if (user) {
      return res.status(400).json({ error: "Email is taken" });
    }

    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      { expiresIn: "15m" }
    );

    //email
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
          <h2>Please use the following link to activate your account:</h2>
          <p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
          
      `,
    };

    sgMail.send(emailData).then((sent) =>
      res.json({
        message: `Email has been sent to ${email}. Follow the instructions to activate your account. `,
      })
    );
  });
};

// exports.signup = (req, res) => {
//   User.findOne({ email: req.body.email }).exec((err, user) => {
//     if (user) {
//       return res.status(400).json({ error: "Email is taken" });
//     }

//     const { name, email, password } = req.body;
//     //* assigning a unique username to the user via the shortId when creating an account
//     let username = shortId.generate();
//     //* the profile will be whatever the domain name of our application
//     let profile = `${process.env.CLIENT_URL}/profile/${username}`;

//     let newUser = new User({ name, email, password, profile, username });
//     newUser.save((err, user) => {
//       if (err) {
//         res.status(400).json({ error: err });
//       }
//       //   res.json({ user });
//       res.json({ message: "Signup sucess! Please signin" });
//     });
//   });
// };

exports.signup = (req, res) => {
  const token = req.body.token;
  if (token) {
    jwt.verify(
      token,
      process.env.JWT_ACCOUNT_ACTIVATION,
      function (err, decoded) {
        if (err) {
          return res.status(401).json({ error: "Expired link. Signup again" });
        }

        const { name, email, password } = jwt.decode(token);
        //generate username
        let username = shortId.generate();
        let profile = `${process.env.CLIENT_URL}/profile/${username}`;

        const user = new User({ name, email, password, username, profile });

        user.save((err, user) => {
          if (err) {
            res.status(400).json({ error: err.message });
          }
          //   res.json({ user });
          res.json({ message: "Signup success! Please signin" });
        });
      }
    );
  } else {
    res.json({ message: "Something went wrong try again" });
  }
};

exports.signin = (req, res) => {
  const { email, password } = req.body;
  //check if user exist
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: "Email or Password is not valid" });
    }
    //authenticate
    //* * we can access the authenticate function found in our user model
    if (!user.authenticate(password)) {
      return res.status(400).json({ error: "Email or Password is not valid" });
    }
    //generate jsonwebtoken and send client
    //* take the user id in the DB and assign it to _id
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    //*saving the token in the cookie
    res.cookie("token", token, { expiresIn: "1d" });

    const { _id, username, name, email, role } = user;

    return res.json({
      token,
      //send only these specified fields to the frontend omitting the password and salt
      user: { _id, username, name, email, role },
    });
  });
};

exports.signout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Signout success" });
};

exports.requireSignin = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
});

exports.authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findById({ _id: authUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ err: "User not found" });
    }

    req.profile = user;
    next();
  });
};

exports.adminMiddleware = (req, res, next) => {
  const adminUserId = req.user._id;
  User.findById({ _id: adminUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({ err: "User not found" });
    }

    if (user.role !== 1) {
      return res.status(400).json({ err: "Admin resource. Access denied" });
    }

    req.profile = user;
    next();
  });
};

exports.canUpdateDeleteBlog = (req, res, next) => {
  const slug = req.params.slug.toLowerCase();
  Blog.findOne({ slug }).exec((err, data) => {
    if (err) {
      res.status(400).json({ error: err.data });
    }
    let authorizedUser =
      data.postedBy._id.toString() === req.profile._id.toString();
    if (!authorizedUser) {
      res
        .status(400)
        .json({ error: "You are not authorized to perform this action" });
    }
    next();
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;
  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res
        .status(401)
        .json({ error: "User with that email does not exist" });
    } else {
      const token = jwt.sign(
        { _id: user._id },
        process.env.JWT_RESET_PASSWORD,
        { expiresIn: "15m" }
      );
      //email
      const emailData = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: `Password reset link`,
        html: `
            <h2>Please use the following link to reset your password:</h2>
            <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
            
        `,
      };

      return user.updateOne({ resetPasswordLink: token }, (err, success) => {
        if (err) {
          return res.json({ error: errorHandler(err) });
        } else {
          sgMail
            .send(emailData)
            .then((sent) =>
              res.json({
                message: `Email has been sent to ${email}. Follow the instructions to reset your password. Link expires in 15min.`,
              })
            )
            .catch((err) => console.log(err.message));
        }
      });
    }
  });
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;
  console.log({ resetPasswordLink, newPassword });

  if (resetPasswordLink) {
    //verifying if the token is not expired
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      function (err, decoded) {
        if (err) {
          return res.status(401).json({ error: "Expired link. Try again" });
        }
        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err || !user) {
            return res
              .status(401)
              .json({ error: "Something went wrong try again later" });
          }

          const updatedFields = {
            password: newPassword,
            resetPasswordLink: "",
          };

          console.log({ user });
          //applying the lodash libary to update only the fields that has been changed
          user = _.extend(user, updatedFields);

          user.save((err, result) => {
            if (err) {
              return res.status(400).json({ error: err.message });
            }
            res.json({
              message: `Password Reset Successfull! now you can login with new password`,
            });
          });
        });
      }
    );
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const idToken = req.body.tokenId;
  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((response) => {
      const { email_verified, name, email, jti } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: "1d",
            });
            res.cookie("token", token, { expiresIn: "1d" });
            const { _id, email, name, role, username } = user;
            return res.json({
              token,
              user: { _id, email, name, role, username },
            });
          } else {
            let username = shortId.generate();
            let profile = `${process.env.CLIENT_URL}/profile/${username}`;
            let password = jti + process.env.JWT_SECRET;
            user = new User({ name, email, password, profile, username });
            user.save((err, data) => {
              if (err) {
                return res.status(400).json({ error: errorHandler(err) });
              }

              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
              );
              res.cookie("token", token, { expiresIn: "1d" });
              const { _id, email, name, role, username } = data;
              return res.json({
                token,
                user: { _id, email, name, role, username },
              });
            });
          }
        });
      } else {
        return res.status(400).json({ error: "Google login failed try again." });
      }
    });
};
