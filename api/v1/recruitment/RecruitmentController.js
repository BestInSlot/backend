"use strict";
const sanitize = require("sanitize-html");
const isString = require("lodash/isString");
const Boom = require("boom");
const App = require("@models/app");
const UserApp = require("@models/userapp");
const { transaction } = require("objection");
const { buildPaginationQuery } = require("@utils/helpers");

class Recruitment {
  async createTemplate(req, reply) {
    // if (!req.auth.data.is_admin) {
    //   throw Boom.unauthorized("401: Unauthorized");
    // }
    const { author_id, fields, title } = req.body;
    const sanitized = JSON.stringify(
      fields.map(field => {
        if (isString(field.question)) {
          field.question = sanitize(field.question, {
            allowedTags: [],
            allowedAttributes: [],
            textFilter: function(text) {
              return text.replace(/\{\{[\s\S]*|[\s\S]*\}\}/gm, "");
            }
          });
        }

        if (field.subElements.length) {
          field.subElements.map(_field => {
            if (isString(_field.value)) {
              _field.value = sanitize(_field.value, {
                allowedTags: [],
                allowedAttributes: [],
                textFilter: function(text) {
                  return text.replace(/\{\{[\s\S]*|[\s\S]*\}\}/gm, "");
                }
              });
            }
            console.log(_field.value);
            return _field;
          });
        }
        return field;
      })
    );

    try {
      await App.query().insert({ title, author_id, fields: sanitized });
    } catch (err) {
      console.log(err);
      throw Boom.badRequest(err.message);
    }

    reply.code(204).send();
  }

  async deleteTemplate(req, reply) {
    if (!req.auth.data.is_admin) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    const { applicationId } = req.body;
    let form;
    try {
      form = await App.query()
        .del()
        .where({ id: applicationId })
        .returning("*");
    } catch (err) {
      throw Boom.internal("500: Encountered an issue fulfilling your request.");
    }

    return {
      deleted: form
    };
  }

  async fetchAllApplicationTemplates(req, reply) {
    // if (!req.auth.data.is_admin || !req.auth.data.is_curator) {
    //   throw Boom.unauthorized("401: Unauthorized");
    // }

    let query = buildPaginationQuery.call(App.query(), req),
      recruitment;

    try {
      recruitment = await query;
    } catch (err) {
      console.log(err);
      throw Boom.internal("Oops. Encountered a problem while loading data.");
    }

    return {
      recruitment
    };
  }

  async readUserApplication(req, reply) {
    if (!req.auth.data.is_admin || !req.auth.data.is_curator) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    const { applicationId } = req.body;

    try {
      await knex("user_applications")
        .patch({ read: true })
        .where({ id: applicationId });
    } catch (err) {
      throw Boom.internal("500 :" + err.message);
    }

    reply.code(204).send();
  }

  async deleteUserApplication(req, reply) {
    if (!req.auth.data.is_admin || !req.auth.data.is_curator) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    const { applicationId } = req.body;

    let application;

    try {
      application = await UserApp.query()
        .del()
        .where({ id: applicationId })
        .returning("*");
    } catch (err) {
      throw Boom.internal("500: Couldn't complete the request");
    }

    return {
      deleted: application
    };
  }

  async fetchUserApplication(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: " + err.message);
    }

    try {
      const query = await UserApp.query()
        .where({ id })
        .first()
        .throwIfNotFound();
    } catch (err) {
      throw Boom.notFound("404: " + err.message);
    }
  }

  async createUserApplication(req, reply) {
    if (!req.auth.data) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    const { fields } = req.body;
    const { id } = req.params;
    const { knex } = this;

    const sanitized = JSON.stringify(
      fields.map(field => {
        if (isString(field.answer)) {
          field.answer = sanitize(field.answer, {
            allowedTags: [],
            allowedAttributes: [],
            textFilter: function(text) {
              return text.replace(/\{\{[\s\S]*|[\s\S]*\}\}/gm, "");
            }
          });
        }
        return field;
      })
    );

    try {
      const _transaction = await transaction(knex, async trx => {
        const app = await UserApp.query(trx)
          .insert({ applicant_id: req.auth.data.id, fields: sanitized })
          .returning("id");
        const relational = await knex("applications")
          .transacting(trx)
          .insert({
            application_template_id: id,
            user_application_id: app.id
          });
        return relational;
      });
    } catch (err) {
      console.log(err);
      throw Boom.internal();
    }

    reply.code(200).send();
  }

  async fetchApplicants(req, reply) {
    // if (!req.auth.data.is_admin || !req.auth.data.is_curator) {
    //   throw Boom.unauthorized("401: Unauthorized");
    // }

    // let query = knex("user_applications")
    //   .innerJoin(
    //     "applications",
    //     "applications.user_application_id",
    //     "user_applications.id"
    //   )
    //   .where("applications.application_template_id", req.params.id);
    // let applicants;

    // if (req.query.current && req.query.limit) {
    //   const current = parseInt(req.query.current, 10),
    //     limit = parseInt(req.query.limit, 10),
    //     offset = (current - 1) * limit;

    //   query = query.offset(offset).limit(limit);
    // } else {
    //   query = query.offset(0).limit(20);
    // }

    // try {
    //   applicants = await query;
    // } catch (err) {
    //   console.log(err);
    //   throw Boom.internal();
    // }
    let query = App.query()
      .select("background", "description", "id", "icon", "title")
      .eager("applications.[applicant]")
      .modifyEager("applications", qb => {
        if (req.query.current && req.query.limit) {
          const current = parseInt(req.query.current, 10),
            limit = parseInt(req.query.limit, 10);
          const start = (current - 1) * limit,
            end = current * limit - 1;
          qb.range(start, end);
        } else {
          qb.range(0, 19);
        }
        qb.select(
          "approved",
          "pending",
          "approved",
          "rejected",
          "fields",
          "created_at",
          "updated_at"
        );
      })
      .modifyEager("applications.[applicant]", qb => {
        qb.select("id", "username", "avatar");
      })
      .where("id", req.params.id)
      .first();

    let recruitment;
    try {
      recruitment = await query;
    } catch (err) {
      console.log(err);
      throw Boom.internal();
    }

    return {
      recruitment
    };
  }

  async fetchAllUserApplications(req, reply) {
    if (!req.auth.data.is_admin || !req.auth.data.is_curator) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    let query = buildPaginationQuery.call(UserApp.query(), req);
    let recruitment;

    try {
      recruitment = await query;
    } catch (err) {
      console.log(err);
      throw Boom.internal("500: " + err.message);
    }

    return {
      recruitment
    };
  }
}

module.exports = Recruitment;
