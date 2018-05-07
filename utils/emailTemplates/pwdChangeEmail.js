module.exports = function(from, to, subject, key, host) {
  let html = `<html>
  <body>
  <h1>Password change request</h1>
  <p>We've sent this email because you've request a password change on our site (www.bestinslot.org). 
  Click on the following link to complete the verification process and change your password. 
  This key will expire within 10 minutes from the initial request.
  <a href="http://${host}"/change-password/action=verify?&key=${key}>Verify me!</a>
  </p>
  </body>
  </html>`;

  let text =
    "We've sent this email because you've request a password change on our site (www.bestinslot.org).\n";
  text +=
    "Copy and paste the following into your broswer to complete the verification process and confirm the password change.\n";
  text += "This key will expire within 10 minutes from the initial request.";
  text += "http://" + host + "/change-password/?action=verify&key=" + key;

  return {
    from,
    to,
    subject,
    html,
    text
  };
};
