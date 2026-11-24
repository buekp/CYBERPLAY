
const session = require("express-session");
const db = require("./db");

class SQLiteSessionStore extends session.Store {
  constructor() {
    super();

    this.getSession = db.prepare(`
      SELECT sess
      FROM sessions
      WHERE sid = ? AND expired > ?
    `);

    this.insertSession = db.prepare(`
      INSERT INTO sessions (sid, sess, expired)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET
        sess = excluded.sess,
        expired = excluded.expired
    `);

    this.deleteSession = db.prepare(`
      DELETE FROM sessions
      WHERE sid = ?
    `);

    this.deleteExpired = db.prepare(`
      DELETE FROM sessions
      WHERE expired <= ?
    `);
  }

  get(sid, callback) {
    try {
      const row = this.getSession.get(sid, Date.now());

      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (error) {
      callback(error);
    }
  }

  set(sid, sess, callback) {
    try {
      const expires = sess.cookie?.expires
        ? new Date(sess.cookie.expires).getTime()
        : Date.now() + 86400000;

      this.insertSession.run(sid, JSON.stringify(sess), expires);

      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.deleteSession.run(sid);
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sess, callback) {
    this.set(sid, sess, callback);
  }

  cleanup() {
    this.deleteExpired.run(Date.now());
  }
}

module.exports = SQLiteSessionStore;
