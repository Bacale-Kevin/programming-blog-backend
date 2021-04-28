const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.contactForm = (req, res) => {
  const { email, name, message } = req.body;

  const emailData = {
    to: process.env.EMAIL_TO,
    from: process.env.EMAIL_FROM,
    subject: `Contact from - ${process.env.APP_NAME}`,
    text: `Email received from contact form \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
    html: `
        <h4>Email received from  contact form:</h4>
        <p>Sender name: ${name}</p>
        <p>Sender email: ${email}</p>
        <p>Sender message: ${message}</p>
        <hr/>
        <p>This email may contain sensitive information</p>
        <p>https://teachandfix.com</p>
    `,
  };
  sgMail
    .send(emailData)
    .then(() => res.json({ success: true }))
    .catch((err) => console.log(err.message));
};

exports.contactBlogAuthorForm = (req, res) => {
  const { authorEmail, email, name, message } = req.body;

  let maillist = [authorEmail, process.env.EMAIL_TO];

  const emailData = {
    to: maillist,
    from: process.env.EMAIL_FROM,
    subject: `Contact from - ${process.env.APP_NAME}`,
    text: `Someone message you from form \n Sender name: ${name} \n Sender email: ${email} \n Sender message: ${message}`,
    html: `
      <strong><h4>Message received from:</h4></strong>
          <p>Name: ${name}</p>
          <p>Email: ${email}</p>
          <p>Message: ${message}</p>
          <hr/>
          <p>This email may contain sensitive information</p>
          <p>https://teachandfix.com</p>
      `,
  };
  sgMail
    .send(emailData)
    .then((data) => res.json({ success: true }))
    .catch((err) => console.log(err.message));
};
