module.exports = function(from, to, subject, password) {
  let html = `<html>
  <body>
  <h1>Password Change: Confirmed</h1>
  <p>We've sent this email because you're password change request on our site (www.bestinslot.org) has been confirmed.</p>
  <p>
  <strong>New Password:</strong> ${password}
  </p>
  </body>
  </html>`;

  let text =
    "We've sent this email because you're password change request on our site (www.bestinslot.org) has been confirmed.\n";
  text += "New password: " + password
  

  return {
    from,
    to,
    subject,
    html,
    text
  };
};
