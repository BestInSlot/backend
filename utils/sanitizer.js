'use strict';
const sanitize = require('sanitizeHtml');

module.exports = function(opts = {}) {
  const _opts = {...opts};
  const props = ["allowedTags", "allowedAttributes", "allowedIframeHostnames"];

  props.forEach(prop => {
    _opts[prop] = typeof opts[prop] === undefined ? [] : opts[prop];
  });

  function _clean(req) {
   let sanitized;
   if (Object.keys(req).length > 1) {
       for (let key in req) {
           if (typeof req[key] === 'object' && !Array.isArray(req[key])) {
               _clean(req[key])
           } else if (Array.isArray(req[key])) {
              const stringified = JSON.stringify(req[key]);
              sanitized = JSON.parse(sanitize(stringified));
           }

           sanitized = sanitize(req[key], _opts);
       }
   } else {
       if (typeof req === 'object' && !Array.isArray(req[key])) {
           _clean(req);
       } 

       sanitized = sanitize(req, _opts);
   }

    return sanitized;
  }

  return function(req, reply, done) {
      let request = req.body || req.query;

      try {
          request = _clean(request);
      } catch (e) {
          done(e);
      }

      done();
  };
};
