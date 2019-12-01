// users.js
class UsersTable {
  constructor(dao) {
    this.dao = dao;
  }

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS Users (
        id string NOT NULL PRIMARY KEY,
        username text,
        first_name text,
        last_name text,
        language_code text,
        account_name text,
        private_key text
      );`;
    return this.dao.run(sql);
  }
}

module.exports = UsersTable;
