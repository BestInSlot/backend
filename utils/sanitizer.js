const sanitize = require('sanitizeHtml');

module.exports = function(opts = {}) {
  const _opts = {...opts};
  const props = ["allowedTags", "allowedAttributes", "allowedIframeHostnames"];

  props.forEach(prop => {
    _opts[prop] = typeof opts[prop] === undefined ? [] : opts[prop];
  });

  function _clean(req) {
    if (typeof req === 'object') {
        for (let key in req) {
            if (typeof req[key] === "object" && !Array.isArray(req[key])) {
                _clean(req[key]);
            }
        }
    } else if (Array.isArray(req)) {
        if (req.length > 1) {
            req.forEach(el => {
                _clean(el);
            })
        } else {
            _clean(req[0])
        }

    } 
    
    req = sanitize(req, _opts);

    return req;
  }

  return function(req, reply, done) {
      let request = req.body || req.query;

      try {
          if (Object.keys(request).length > 1) {
              for (let key in request) {
                  request[key] = _clean(request[key]);
              }
          } else {
              request = _clean(request);
          }
      } catch (e) {
          done(e);
      }

      done();
  };
};
