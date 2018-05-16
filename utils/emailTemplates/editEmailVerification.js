module.exports = function(from, to, subject, key, host, username) {
  let html = `<html>
  <body>
  <h1>Thanks for register!</h1>
  <p>We've sent this email because you registered on our site (www.bestinslot.org). 
  Click on the following link to complete the verification process and activate your account. 
  <a href="http://${host}"/myaccount?action=edit&type=email&key=${key}>Verify me!</a>
  </p>
  </body>
  </html>`;

  let text =
    "Thanks for register! We've sent this email because you registered on our site (www.bestinslot.org).\n";
  text +=
    "Copy and paste the following into your broswer to complete the verification process and activate your account.\n";
  text += "http://" + host + "/myaccount?action=edit&type=email&key=" + key;

  return {
    from,
    to,
    subject,
    html,
    text
  };
};
