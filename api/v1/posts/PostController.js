"use strict";
const Post = require("./PostModel");
const Boom = require("boom");
const slug = require("slug");

class Posts {
  constructor() {}

  async create(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: Unauthorized.");
    }

    const { discourse } = this;

    let { post } = req.body,
      newPost,
      newDiscoursePost = null;

    try {
      newDiscoursePost = await discourse()
        .posts()
        .create({
          title: post.title,
          raw: post.body,
          category: 0
        });
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!Object.keys(newDiscoursePost).length) {
      throw Boom.internal("Encountered an interal server error.");
    } else {
      newDiscoursePost = newDiscoursePost.data;
    }

    post.slug = slug(post.title).toLowerCase();
    post.forum_topic_id = newDiscoursePost.topic_id;
    post.forum_ref = `https://${process.env.DISCOURSE_HOST}:${
      process.env.DISCOURSE_PORT
    }/t/${newDiscoursePost.topic_slug}/${newDiscoursePost.topic_id}`;

    try {
      newPost = await Post.query()
        .insert(post)
        .first()
        .returning("*");
    } catch (e) {
      throw Boom.internal(e);
    }

    return {
      post: newPost
    };
  }

  async edit(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: Unauthorized.");
    }

    let { post } = req.body,
      { id } = req.params,
      updatedForumTopic,
      editedPost;

    const forumTopicSlug = post.forum_ref.split("/")[2];

    try {
      updatedForumTopic = await discourse()
        .posts()
        .updateTopic(forumTopicSlug, post.forum_topic_id);
    } catch (e) {
      throw Boom.internal(e);
    }

    if (!Object.keys(updatedForumTopic).length) {
      throw Boom.internal(`[E0001]: ${e}`);
    } else {
      updatedForumTopic = updatedForumTopic.data;
    }

    post.slug = slug(post.title);
    post.forum_ref = `${process.env.DISCOURSE_HOST}:${
      process.env.DISCOURSE_PORT
    }/t/${updatedForumTopic.slug}/${post.forum_topic_id}`;

    try {
      editedPost = await Post.query()
        .patch(post)
        .where({ id })
        .first()
        .returning("*");
    } catch (e) {
      throw Boom.internal(e);
    }

    return {
      post: editedPost
    };
  }

  async delete(req, reply) {
    if (!req.auth) {
      throw Boom.unauthorized("401: Unauthorized.");
    }

    let { id } = req.params,
      deleted,
      topic_deleted;

    const { discourse } = this;

    try {
      deleted = await Post.query()
        .del()
        .where({ id })
        .first()
        .returning("*");
    } catch (e) {
      throw Boom.internal(e);
    }

    if (deleted.forum_topic_id !== null) {
      try {
        topic_deleted = await discourse()
          .posts()
          .delete(deleted.forum_topic_id);
      } catch (err) {
        if (err.response) {
          if (err.response.status === 404) {
            throw Boom.notFound("Not Found.");
          } else if (err.response.status > 404) {
            throw Boom.internal(e);
          }
        }
      }
    }

    return {
      post: deleted
    };
  }

  async fetchPost(req, reply) {
    let { id } = req.params,
      post;

    try {
      post = await Post.query()
        .eager("author")
        .modifyEager("author", qb => qb.select("username", "slug", "avatar"))
        .where({ id })
        .first()
        .throwIfNotFound();
    } catch (e) {
      throw Boom.notFound(e);
    }

    console.log(post);

    return {
      post
    };
  }

  async index(req, reply) {
    let q = req.query,
      limit,
      page,
      posts;

    let query = Post.query()
      .eager("author")
      .modifyEager("author", qb => qb.select("id", "username", "slug", "avatar"));

    if (q.searchByTitle) {
      query = query.where("title", q.searchByTitle);
    }
    
    if (q.orderBy) {
      query = query.orderBy("created_at", q.orderBy);
    } else {
      query = query.orderBy("created_at", "DESC");
    }

    if (q.page && q.limit) {
      (page = parseInt(q.page, 10)), (limit = parseInt(q.limit, 10));
      let start = (page - 1) * limit,
        end = page * limit - 1;

      query = query.range(start, end);
    } else {
      query = query.range(0, 19);
    }

    try {
      posts = await query.throwIfNotFound();
    } catch (e) {
      throw Boom.notFound(e);
    }

    delete posts.author_id;

    return {
      posts
    };
  }
}

module.exports = Posts;
