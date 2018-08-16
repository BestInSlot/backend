"use strict";
const isEmpty = require("lodash/isEmpty");
const querystring = require("querystring");

function confirmation(from, to, subject, new_password) {
  let html = `<html>
  <body style="background-color: #1f1f1f; color: #cacaca;">
  <div style="margin: 10px auto; width: 100%; padding: 2.5rem 0 0; text-align: center;">
    <img style="width: 90px; height: 90px;" />
    <h3>Password Update Confirmation</h3>
    <div>
      <p>Your password change has been authenticated and approved.</p>
      <p><strong>Password: ${new_password}</strong></p>
    </div>
  </div>
  </body>
  </html>`;

  let text =
    "Password Update Confirmation\nYour password change request has been authenticated and approved.\n\nPassword: " +
    new_password;
}

function authentication(from, to, subject, code, address, query) {
  address = address || "http://localhost:8080/account/security/verify/";

  if (query && !isEmpty(query)) {
    const obj = { ...query, code };
    const q = querystring.stringify(obj);
    address = address.concat(q);
  } else {
    address = address.concat(code);
  }

  let html = `<html>
    <body style="background-color: #1f1f1f; color: #cacaca;">
    <div style="margin: 10px auto; width: 100%; padding: 2.5rem 0 0; text-align: center;">
      <img style="width: 90px; height: 90px;" />
      <h3>User Account Detail Changes</h3>
      <div>
        <p>We've sent this email because you've requested the following changes to your password require further verification.</p>
        <p>Click on the button below to complete the verification process and authorize the change.</p>
        <p><strong>This key will expire within 10 minutes from the initial request.</strong></p>
      </div>
      <a style="text-decoration: none; color: #fff; font-size: 18px;" href="${address}">
        <span style="display: block; background-color: #2980b9; padding: 1rem; text-align: center; width:200px; margin: 5rem auto; cursor: pointer">
              Verify!
        </span>
      </a>
    </div>
    </body>
    </html>`;

  let text =
    "We've sent this email because you've request a password change on our site (www.bestinslot.org).\n" +
    "Copy and paste the following into your broswer to complete the verification process and confirm the password change.\n" +
    "\nCopy and paste the following link into your broswer to complete the verification process and change the above mentioned details:\n" +
    address +
    "\n\nThis key will expire within 10 minutes from the initial request.";

  return {
    from,
    to,
    subject,
    html,
    text: text.trim()
  };
}

module.exports = {
  authentication,
  confirmation
};
