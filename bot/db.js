// Работаем с локальной базой SQLite

const sqlite3 = require("sqlite3").verbose();
const DB_PATH = "./sqlite.db";
const Promise = require("bluebird");

class AppDAO {
  constructor(dbFilePath) {
    this.db = new sqlite3.Database(dbFilePath, err => {
      if (err) {
        console.log("Could not connect to database", err);
      } else {
        console.log("Connected to database");
      }
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.log("Error running sql " + sql);
          console.log(err);
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          console.log("Error running sql: " + sql);
          console.log(err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.log("Error running sql: " + sql);
          console.log(err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

// const Promise = require('bluebird')
const UsersTable = require("./db/users");
const QuestionsTable = require("./db/questions");

// Database and Tables
const dao = new AppDAO("./sqlite.db");
const users = new UsersTable(dao);
const questions = new QuestionsTable(dao);

users
  .createTable()
  .then(() => questions.createTable())
  .then(() => {
    resolve("success");
  })
  .catch(err => {
    console.log("DB Error: ", JSON.stringify(err));
  });

const DB = new sqlite3.Database(DB_PATH, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log("Connected to " + DB_PATH + " database.");

  DB.exec("PRAGMA foreign_keys = ON;", function(error) {
    if (error) {
      console.error("Pragma statement didn't work.");
    } else {
      console.log("Foreign Key Enforcement is on.");
    }
  });
});

function addUser(
  id,
  username,
  first_name,
  last_name,
  language_code,
  account_name,
  private_key,
  callback
) {
  var sql =
    "INSERT INTO Users (id, username, first_name, last_name, language_code, account_name, private_key) ";
  sql += "VALUES (? ,?, ?, ?, ?, ? , ?) ";

  DB.run(
    sql,
    [
      id,
      username,
      first_name,
      last_name,
      language_code,
      account_name,
      private_key
    ],
    function(error) {
      if (error) {
        console.log(error);
        callback(false);
      } else {
        // console.log("Last ID: " + this.lastID);
        // console.log("# of Row Changes: " + this.changes);
        callback(true);
      }
    }
  );
}

function getUser(id, callback) {
  var sql =
    "SELECT id, username, first_name, last_name, language_code, account_name, private_key ";
  sql += "FROM Users ";
  sql += "WHERE id = ? ";

  DB.get(sql, id, function(error, row) {
    if (error) {
      console.log(error);
      callback(null);
      return;
    }

    callback(row);
  });
}

function getUserByName(username, callback) {
  var sql =
    "SELECT id, username, first_name, last_name, language_code, account_name, private_key ";
  sql += "FROM Users ";
  sql += "WHERE username = ? ";

  DB.get(sql, username, function(error, row) {
    if (error) {
      console.log(error);
      callback(null);
      return;
    }

    callback(row);
  });
}

const uuid = require("uuid-random");

function addQuestion(
  user_id,
  stake,
  winners,
  question,
  answer,
  claimed,
  won,
  callback
) {
  var sql =
    "INSERT INTO Questions (id, user_id, stake, winners, question, answer, claimed, won) ";
  sql += "VALUES (? ,?, ?, ?, ?, ? , ?, ?) ";

  const id = uuid();
  DB.run(
    sql,
    [id, user_id, stake, winners, question, answer, claimed, won],
    function(error) {
      if (error) {
        console.log(error);
        callback(false);
      } else {
        // console.log("Last ID: " + this.lastID);
        // console.log("# of Row Changes: " + this.changes);
        callback(id);
      }
    }
  );
}

function getQuestion(id, callback) {
  var sql =
    "SELECT id, user_id, stake, winners, question, answer, claimed, won ";
  sql += "FROM Questions ";
  sql += "WHERE id = ? ";

  DB.get(sql, id, function(error, row) {
    if (error) {
      console.log(error);
      callback(null);
      return;
    }

    callback(row);
  });
}

function updateQuestion(id, has_won, callback) {
  const question = getQuestion(id, q => {
    if (q) {
      var sql = "UPDATE Questions ";
      if (has_won) {
        sql += "SET claimed=" + (q.claimed + 1) + ", won=" + (q.won + 1);
      } else {
        sql += "SET claimed=" + (q.claimed + 1);
      }
      sql += " WHERE id=? ";

      DB.get(sql, id, function(error, row) {
        if (error) {
          console.log(error);
          if (callback) callback(null);
          return;
        }

        if (callback) callback(row);
      });
    }
  });
}

module.exports = {
  addUser,
  getUser,
  getUserByName,
  AppDAO,
  dao,
  UsersTable,
  QuestionsTable,
  addQuestion,
  getQuestion,
  updateQuestion
};
