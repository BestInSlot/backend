"use strict";
const { Model, ValidationError, NotFoundError } = require("objection");
const {
  DBError,
  ConstraintViolationError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError
} = require("objection-db-errors");
const fp = require("fastify-plugin");

function errorHandler(err, req, reply) {
  if (err instanceof ValidationError) {
    switch (err.type) {
      case "ModelValidation":
        reply.code(400).send({
          message: err.message,
          type: "ModelValidation",
          data: err.data
        });
        break;
      case "RelationExpression":
        reply.code(400).send({
          message: err.message,
          type: "InvalidRelationExpression",
          data: {}
        });
        break;
      case "UnallowedRelation":
        reply.code(400).send({
          message: err.message,
          type: "UnallowedRelation",
          data: {}
        });
        break;
      default:
        reply.code(400).send({
          message: err.message,
          type: "UnknownValidationError",
          data: {}
        });
    }
  } else if (err instanceof NotFoundError) {
    reply.code(404).send({
      message: err.message,
      type: "NotFound",
      data: {}
    });
  } else if (err instanceof UniqueViolationError) {
    reply.code(409).send({
      message: err.message,
      type: "UniqueViolation",
      data: {
        columns: err.columns,
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof NotNullViolationError) {
    reply.code(400).send({
      message: err.message,
      type: "NotNullViolation",
      data: {
        column: err.column,
        table: err.table
      }
    });
  } else if (err instanceof ForeignKeyViolationError) {
    reply.code(409).send({
      message: err.message,
      type: "ForeignKeyViolation",
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof CheckViolationError) {
    reply.code(400).send({
      message: err.message,
      type: "CheckViolation",
      data: {
        table: err.table,
        constraint: err.constraint
      }
    });
  } else if (err instanceof DataError) {
    reply.code(500).send({
      message: err.message,
      type: "UnknownDatabaseError",
      data: {}
    });
  } else if (err && err.name === "UnauthorizedError") {
    if (err.message === "jwt expired") {
      reply.code(401).send({
        message: err.message,
        type: "UnauthorizedError",
        token_expired: true
      });
    } else if (err.message === "jwt malformed") {
      reply.code(403).send({
        message: err.message,
        type: "[UnauthorizedError]: Invalid token.",
        data: {}
      })
    }
  } else if (err && err.isBoom) {
    reply
      .code(err.output.statusCode)
      .type("application/json")
      .headers(err.output.headers)
      .send(err.output.payload);
  } else {
    reply.code(500).send({
      message: err.message,
      type: 'UnknownError',
      data: {}
    })
  }
}

module.exports = fp(function(fastify, opts, next) {
  try {
    Model.knex(fastify.knex);
    fastify.setErrorHandler(errorHandler);
    next();
  } catch (err) {
    next(err);
    process.exit(1);
  }
});
