// questions.js
class QuestionsTable {
  constructor(dao) {
    this.dao = dao;
  }

  createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS Questions (
        id string NOT NULL PRIMARY KEY,
        user_id string,
        stake int,
        winners int,
        question text,
        answer bool,
        claimed int,
        won int
      );`;
    return this.dao.run(sql);
  }
}

module.exports = QuestionsTable;
