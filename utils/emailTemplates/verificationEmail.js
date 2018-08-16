module.exports = function(from, to, subject, data, host) {
  let html = `<html>
  <body style="background-color:#272727;">
    <div style="background-color: #1f1f1f; margin: 0 auto; width 400px; height: 500px;">
      <div style="text-align: center;">
        <img style="width: 90px; height: 90px;" />"
      </div>
      <div style="text-align: center;">
        <h1>Thanks for register!</h1>
        <p>We've sent this email because you registered on our site (www.bestinslot.org). 
        Click on the following link to complete the verification process and activate your account. 
        <a href="http://${host}/verify/${data}">Verify me!</a>
        </p>
      </div>
    </div>
  </body>
  </html>`;

  let text =
    "Thanks for register! We've sent this email because you registered on our site (www.bestinslot.org).\n";
  text +=
    "Copy and paste the following into your broswer to complete the verification process and activate your account.\n";
  text += "http://" + host + "/verify/" + data

  return {
    from,
    to,
    subject,
    html,
    text
  };
};
