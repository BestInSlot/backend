'use strict';
const crypto = require('crypto');
const querystring = require('querystring');

module.exports = class SingleSignOn {
    constructor(secret) {
        this.secret = secret;
    }

     _getHmac() {
        return crypto.createHmac('sha256', this.secret);
    }

    validate(payload, sig) {
        const hmac = this._getHmac();
        hmac.update(querystring.unescape(payload));
        if (hmac.digest("hex") === sig) {
            return true
        } else {
            return false;
        }
    }

    getNonce(payload) {
        const q = querystring.parse(
            new Buffer(querystring.unescape(payload), 'base64').toString()
        );

        console.log(q);

        if ("nonce" in q) {
            return q['nonce'];
        } else {
            throw new Exception("Missing Nonce in payload");
        }
    }

    buildLoginString(params = {}) {
        if (!("external_id" in params)) {
            throw new Exception("Missing required param 'external_id'");
        }

        if (!("nonce" in params)) {
            throw new Exception("Missing required param 'nonce'");
        }

        if (!("email" in params)) {
            throw new Exception("Missing required param 'email'");
        }

        const payload = new Buffer(querystring.stringify(params), 'utf8').toString('base64');
        const hmac = this._getHmac();
        hmac.update(payload);

        // return querystring.stringify({
        //     sso: payload,
        //     sig: hmac.digest('hex')
        // });

        return {
            sso: payload,
            sig: hmac.digest('hex')
        }
    }
    
}

// module.exports = function SingleSignOn(secret) {
//     this.secret = secret;

//     function _getHmac(secret) {
//         console.log(secret)
//         return crypto.createHmac('sha256', secret);
//     }

//     function validate(payload, sig) {
//         const hmac = _getHmac(this.secret);
//         hmac.update(querystring.unescape(payload));
//         if (hmac.digest("hex") === sig) {
//             return true
//         } else {
//             return false;
//         }
//     }

//     function getNonce(payload) {
//         const q = querystring.parse(
//             new Buffer(querystring.unescape(payload), 'base64').toString()
//         );

//         if ("nonce" in q) {
//             return q['nonce'];
//         } else {
//             throw new Exception("Missing Nonce in payload");
//         }
//     }

//     function buildLoginString(params = {}) {
//         if (!("external_id" in params)) {
//             throw new Exception("Missing required param 'external_id'");
//         }

//         if (!("nonce" in params)) {
//             throw new Exception("Missing required param 'nonce'");
//         }

//         if (!("email" in params)) {
//             throw new Exception("Missing required param 'email'");
//         }

//         const payload = new Buffer(querystring.stringify(params), 'utf8').toString('base64');
//         const hmac = _getHmac(this.secret);
//         hmac.update(payload);

//         // return querystring.stringify({
//         //     sso: payload,
//         //     sig: hmac.digest('hex')
//         // });

//         return {
//             sso: payload,
//             sig: hmac.digest('hex')
//         }
//     }

//     return {
//         validate,
//         getNonce,
//         buildLoginString
//     };
// }