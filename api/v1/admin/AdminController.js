"use strict";
const Boom = require("boom");
/* MODELS */
const User = require("../users/UserModel");
const Post = require("../posts/PostModel");
/* CONTROLLER CLASSES */
const PostController = require("../posts/PostController");
const UserController = require("../users/UserController");

class AdminUserController extends UserController {
  async adminLogin(req, reply) {
    if (!req.auth && !req.auth.data.admin) {
      throw Boom.unauthorized("401: Unauthorized.");
    }
    super.login(req, reply);
  }

  async createNewUser(req, reply) {
    if (!req.auth && !req.auth.data.is_admin) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    let { credentials } = req.body,
      user;

    try {
      user = await User.query()
        .insert({
          username: credentials.username,
          fullname: credentials.fullname,
          email: credentials.email,
          password: credentials.password,
          approved: true,
          show_notifications: false
        })
        .first()
        .returning("*");
    } catch (err) {
      throw Boom.internal(err);
    }

    return {
      user
    };
  }

  async editUser(req, reply) {
    if (!req.auth && !req.auth.data.is_admin) {
      throw Boom.unauthorized("401: Unauthorized");
    }

    let { options } = req.body,
      { id } = req.params,
      user;

    try {
      user = await User.query()
        .patch(options)
        .where({ id })
        .first()
        .returning("*");
    } catch (err) {
      throw Boom.internal(err);
    }

    return {
      user
    };
  }

  async delete(req, reply) {
    // if (!req.auth && !req.auth.data.is_admin) {
    //   throw Boom.unauthorized("401: Unauthorized Access");
    // }

    const ids = req.query["ids[]"];
    const { deleteForumPosts } = req.query,
      { discourse } = this;

    let externalUserIds;

    let userQuery = Users.query()
        .del()
        .returning("id"),
      postQuery = Post.query()
        .del()
        .returning("id");

    if (Array.isArray(ids)) {
      ids = ids.map(id => parseInt(id, 10));
      userQuery = userQuery.whereIn("id", ids);
      postQuery = postQuery.whereIn("id", ids);

      externalUserIds = Promise.all(
         ids.map(async query =>
          await discourse()
            .users()
            .findByExternalId(query.id)
        )
      ).catch(err => {
        console.log(err);
        throw Boom.internal("500: Internal Server Error");
      });

      externalUserIds = externalUserIds.map(results => results.data.id);
    } else {
      ids = parseInt(ids, 10);
      userQuery = userQuery.where("id", ids);
      postQuery = postQuery.where("id", ids);

      try {
        externalUserIds = await discourse()
          .users()
          .findByExternalId(ids);
      } catch (err) {
        throw Boom.internal("500: Internal Server Error");
      }
    }

    const [users, posts] = Promise.all([await userQuery, await postQuery]);

    if (!externalUserIds.length) {
      throw Boom.internal("500: Internal Server Error");
    }

    let deletedForumData = Promise.all(
       externalUserIds.map(async id => {
        await discourse.users().delete(id, deleteForumPosts);
      })
    );

    return {
      users,
      posts
    };
  }

  async fetch(req, reply) {
    // if (!req.auth.admin) {
    //   throw Boom.unauthorized("401: Unauthorized Access");
    // }

    let { page, limit, orderBy, sortBy, filters } = req.query;
    let users = User.query();

    if (filters) {
      if (filters.is_approved) {
        users = users.where("approved", true);
      } else {
        users = users.where("approved", false);
      }

      if (filters.is_banned) {
        users = users.whereNotNull("banned_at");
      } else {
        users = users.whereNull("banned_at");
      }

      if (filters.searchByUsername) {
        users = users.where({ username: filter.searchByUsername });
      }
    }

    if (orderBy && sortBy) {
      users = users.orderBy(sortBy, orderBy);
    } else {
      users = users.orderBy("id", "ASC");
    }

    if (page && limit) {
      let offset = parseInt(page, 10),
        perPage = parseInt(limit, 10);
      let start = (offset - 1) * perPage,
        end = offset * perPage - 1;

      users = users.range(start, end);
    } else {
      users = users.range(0, 19);
    }

    try {
      users = await users.throwIfNotFound();
    } catch (err) {
      if (err instanceof User.notFound) {
        throw Boom.notFound(e);
      }
      throw Boom.internal(e);
    }

    users.results = users.results.map(user => {
      const {
        id,
        username,
        email,
        approved,
        banned_at,
        is_admin,
        is_curator,
        created_at,
        updated_at
      } = user;
      return {
        data_type: "user",
        columns: {
          id,
          username,
          email,
          approved,
          is_admin,
          is_curator,
          is_banned: !!banned_at,
          created_at,
          updated_at
        },
        selected: false
      };
    });

    return {
      users
    };
  }
}

class AdminPostController extends PostController {
  async fetch(req, reply) {
    let { page, limit, orderBy, sortBy } = req.query,
      posts;

    let query = Post.query();

    // if (filters.seachBy) {
    //   const search = filters.searchBy.split(":");
    //   if (search[0] === "author") {
    //     query = query
    //       .innerJoin("posts", "posts.author_id", "users.id")
    //       .select(
    //         "users.username",
    //         "users.slug",
    //         "posts.id",
    //         "posts.title",
    //         "posts.slug",
    //         "posts.created_at",
    //         "posts.updated_at"
    //       )
    //       .where("users.username", search[1]);
    //   } else {
    //     query = query.where(search[0], search[1]);
    //   }
    // } else {
    //   query = query
    //     .select("id", "title", "slug", "created_at", "updated_at")
    //     .eager("author")
    //     .modifyEager("author", qb => qb.select("username", "slug"));
    // }
    if (orderBy && sortBy) {
      if (sortBy === "author") {
        query = query.orderBy("author_id", orderBy);
      }
      query = query.orderBy(sortBy, orderBy);
    } else {
      query = query.orderBy("id", "DESC");
    }

    if (page && limit) {
      let o = parseInt(page, 10),
        l = parseInt(limit, 10);
      let start = (o - 1) * l,
        end = o * l - 1;

      query = query.range(start, end);
    } else {
      query = query.range(0, 19);
    }

    try {
      posts = await query
        .select("id", "title", "featured", "created_at", "updated_at")
        .eager("author")
        .modifyEager("author", qb => qb.select("username", "id"));
    } catch (err) {
      throw Boom.internal(err);
    }

    //format the returned object
    posts.results = posts.results.map(el => {
      const { id, title, featured, created_at, updated_at } = el;
      return {
        data_type: "post",
        columns: {
          id,
          title,
          author: el.author.username,
          featured,
          created_at,
          updated_at
        },
        selected: false
      };
    });

    return {
      posts
    };
  }

  async fetchPost(req, reply) {
    let { id } = req.params,
      post;
    try {
      post = await Post.query()
        .where("id", parseInt(id, 10))
        .select(
          "id",
          "title",
          "body",
          "featured",
          "featured_image_src",
          "draft"
        )
        .first()
        .throwIfNotFound();
    } catch (err) {
      console.log(err);
      throw Boom.notFound("404: Not Found");
    }

    return {
      post
    };
  }

  async edit(req, reply) {
    if (!req.auth && !req.auth.data.admin) {
      throw Boom.unauthorized("401: Unauthorized.");
    }
    super.edit(req, reply);
  }

  async create(req, reply) {
    if (!req.auth && !req.auth.data.admin) {
      throw Boom.unauthorized("401: Unauthorized.");
    }
    super.create(req, reply);
  }

  async delete(req, reply) {
    // if (!req.auth && !req.auth.data.is_admin) {
    //   throw Boom.unauthorized("401: Unauthorized");
    // }

    let { discourse } = this;
    let ids = req.query["ids[]"];

    let deletedNewsPosts, deletedForumPosts;

    let query = Post.query()
      .del()
      .returning("id");

    if (Array.isArray(ids)) {
      ids = ids.map(id => parseInt(id, 10));
      query = query.whereIn("id", ids);
    } else {
      query = query.where("id", parseInt(ids, 10));
    }

    try {
      deletedNewsPosts = await query;
    } catch (err) {
      throw Boom.internal(err);
    }

    let forumPosts = deletedNewsPosts
      .filter(post => post.topic_id)
      .map(post => post.topic_id);

    if (forumPosts.length > 0) {
      deletedForumPosts = Promise.all(
        forumPosts.map(async id => {
          await discourse()
            .posts()
            .delete(id);
        })
      ).catch(err => {
        throw Boom.boomify(err.response.status, err.response.data.message);
      });
    }

    return {
      news_posts: deletedNewsPosts,
      forum_posts: deletedForumPosts
    };
  }
}

module.exports = {
  AdminPostController,
  AdminUserController
};
