const expect = require("chai").expect;
const querystring = require("querystring");
const crypto = require("crypto");
const axios = require("axios");

module.exports = function(server) {
  let app;
  before(done => {
    app = server();
    done();
  });

  after(done => {
    app.close();
    done();
  });

  describe("POST /media/streams/add", () => {
    const owner = "dota2ti";
    it("SHOULD SEND BACK A RESPONSE WITH STATUS 200 AND PAYLOAD WITH THE KEY OF STREAM_OWNER", async () => {
      await app.listen(0);
      try {
        const res = await axios.post(
          "http://99.254.252.201:1337/api/media/streams/add",
          { owner }
        );
        expect(res.status).to.equal(200);
        expect(res.data).to.have.deep.keys("stream_owner");
      } catch (err) {
        console.log(err);
      }
    });
  });
};
