"use strict";
const Recruit = require("./RecruitmentController");
const Recruitment = new Recruit();
// const schema = {
//   createTemplate: {
//     body: {
//       type: "object",
//       required: ["author_id", "title", "fields"],
//       properties: {
//         author_id: { type: "string" },
//         title: { type: "string" },
//         fields: { type: "object" }
//       }
//     }
//   },
//   updateTemplates: {
//     ...schema.createTemplate.body,
//     params: {
//       type: "object",
//       required: ["id"],
//       properties: {
//         id: { type: "number" }
//       }
//     }
//   },
//   createUserApplication: {
//     body: {
//       type: "object",
//       required: ["applicant_id", "application_id", "fields"],
//       properties: {
//         applicant_id: { type: "number" },
//         application_id: { type: "number" },
//         fields: { type: "object" },
//         approved: { type: "boolean" },
//         rejected: { type: "boolean" },
//         pending: { type: "boolean" }
//       }
//     }
//   }
// };
module.exports = function(app, opts, next) {
  const { auth, sanitizer } = app;
  app.route({
    url: "/admin/template",
    method: "POST",
    beforeHandler: [
      auth,
      sanitizer({ allowedTags: [], allowedAttributes: [] })
    ],
    handler: Recruitment.createTemplate
  });
  // app.route({
  //   url: "/admin/recruitment/template/:id",
  //   method: "PUT",
  //   beforeHandler: [
  //     auth,
  //     sanitizer({ allowedTags: [], allowedAttributes: [] })
  //   ],
  //   handler: Recruitment.updateTemplate
  // });
  app.route({
    url: "/admin/template/:id",
    method: "DELETE",
    handler: Recruitment.deleteTemplate
  });
  app.route({
    url: "/apply/:id",
    method: "POST",
    beforeHandler: [
      auth,
      sanitizer({ allowedTags: [], allowedAttributes: [] })
    ],
    handler: Recruitment.createUserApplication
  });
  // app.route({
  //   url: "/recruitment",
  //   method: "PUT",
  //   beforeHandler: [
  //     auth,
  //     sanitizer({ allowedTags: [], allowedAttributes: [] })
  //   ],
  //   handler: Recruitment.updateUserApplication
  // });
  // app.route({
  //   url: "/recruitment",
  //   method: "DELETE",
  //   beforeHandler: [
  //     auth,
  //     sanitizer({ allowedTags: [], allowedAttributes: [] })
  //   ],
  //   handler: Recruitment.deleteUserApplication
  // });
  app.route({
    url: "/applicants/:id",
    method: "GET",
    handler: Recruitment.fetchApplicants
  });
  app.route({
    url: "/templates",
    method: "GET",
    handler: Recruitment.fetchAllApplicationTemplates
  })
  // app.route({
  //   url: "/recruitment/template/:tid/applicant/:id",
  //   method: "GET",
  //   handler: Recruitment.fetchSingleApplicant
  // });
  next();
};
