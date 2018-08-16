"use strict";
function iterate(obj, el) {
  return Object.keys(obj)
    .map(key => {
      key = key.charAt(0).toUpperCase() + key.slice(1);
      return el ? `<${el}>${key}</${el}>` : key;
    })
    .join(el ? "" : "\n")
    .trim();
}

module.exports = function(from, to, subject, code, extra) {
  const fields = iterate(extra, "li");

  let html = `<html>
    <body style="background-color: #272727; color: #cacaca;">
    <div style="background-color: #1f1f1f; margin: 0 auto; width: 100%; height: 500px; text-align: center; position: relative;">
      <img style="width: 90px; height: 90px;" />
      <h3>User Account Detail Changes</h3>
      <div style="text-align: left; padding: 0 5rem;">
        <p>We've sent this email because you've requested the following changes to your personal details which require further verification:</p>
        <ul>${fields}</ul>
        <p>Click on the button below to complete the verification process and change the above mentioned details.</p>
        <p><strong>This key will expire within 10 minutes from the initial request.</strong></p>
      </div>
      <span style="display: block; background-color: #2980b9; padding: 1rem; text-align: center; width:200px; margin: 5rem auto; cursor: pointer">
            <a style="text-decoration: none; color: #fff; font-size: 18px;" href="http://localhost:8080/account/personal/verify/${code}">Verify!</a>
      </span>
    </div>
    </body>
    </html>`;

  let text =
    "We've sent this email because you've requested the following changes to your personal details which require further verification:\n";
  text += iterate(extra);
  text +=
    "\nCopy and paste the following link into your broswer to complete the verification process and change the above mentioned details:\n";
  text += "http://localhost:8080/account/personal/verify/" + code;

  return {
    from,
    to,
    subject,
    html,
    text
  };
};
