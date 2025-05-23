import { Caption, Image, Meme } from "../models.mjs";
import { db } from "../db/db.mjs";

const getImageById = (imageId) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM images WHERE id=?";
    db.get(sql, [imageId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const image = new Image(row.id, row.path);
        resolve(image);
      }
    });
  });
};

const getCaptionById = (captionId) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM captions WHERE id=?";
    db.get(sql, [captionId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const caption = new Caption(row.id, row.captionText);
        resolve(caption);
      }
    });
  });
};

const getMemeById = (id) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM memes WHERE id=?";
    db.get(sql, [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        const image = getImageById(row.imageId)
          .then((img) => {
            return img;
          })
          .catch((err) => reject(err));
        const caption = getImageById(row.captionId)
          .then((cpt) => {
            return cpt;
          })
          .catch((err) => reject(err));
        const meme = new Meme(image, caption);
        resolve(meme);
      }
    });
  });
};

const getCaptionsByImage = (imageId) => {
  return new Promise((resolve, reject) => {
    const sql =
      "SELECT C.id AS cid, C.captionText AS cct FROM captions AS C, memes AS M WHERE M.captionId=C.id AND M.imageId=?";
    db.all(sql, [imageId], (err, rows) => {
      if (err) {
        reject(err);
      } else if (rows.length<2){
        resolve({error: 'Too few correct captions'});
      } else {
        const captions = rows.map((row) => new Caption(row.cid, row.cct));
        resolve(captions);
      }
    });
  });
};

const getAllImages = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM images";
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const images = rows.map((row) => new Image(row.id, row.path));
        resolve(images);
      }
    });
  });
};

const getAllCaptions = () => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM captions";
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
      } else if (rows.length<7) {
        resolve({error: 'Too few captions'})
      } else {
        const captions = rows.map(
          (row) => new Caption(row.id, row.captionText)
        );
        resolve(captions);
      }
    });
  });
};

const saveHistory = (userId, history) => {
  return new Promise((resolve, reject) => {
    let sql = "BEGIN TRANSACTION";
    db.run(sql, function (err) {
      if (err) {
        reject(err);
      }
      
      sql = "INSERT INTO history (userId, date, points) VALUES (?,?,?)";
      db.run(sql, [userId, history.date, history.points], function (err) {
        if (err) {
          db.run("ROLLBACK");
          reject(err);
        }

        const hid = this.lastID;
        sql =
          "INSERT INTO rounds (historyId, imageId, isCorrect) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)";
        db.run(
          sql,
          [
            hid,
            history.rounds[0].imageId,
            history.rounds[0].isCorrect ? 1 : 0,
            hid,
            history.rounds[1].imageId,
            history.rounds[1].isCorrect ? 1 : 0,
            hid,
            history.rounds[2].imageId,
            history.rounds[2].isCorrect ? 1 : 0,
          ],
          function (err) {
            if (err) {
              db.run("ROLLBACK");
              reject(err);
            }

            db.run("COMMIT", function (err) {
              if (err) {
                db.run("ROLLBACK");
                reject(err);
              } else {
                resolve();
              }
            });
          }
        );
      });
    });
  });
};

const getHistoryList = (userId) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT id, date, points FROM history WHERE userId=?";
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const historyList = rows.map((row) => {
          return { historyId: row.id, date: row.date, points: row.points };
        });
        resolve(historyList);
      }
    });
  });
};

const getHistoryElement = (historyId) => {
  return new Promise((resolve, reject) => {
    const sql = "SELECT imageId, isCorrect FROM rounds WHERE historyId=?";
    db.all(sql, [historyId], (err, rows) => {
      if (err) {
        reject(err);
      } else if (rows.length<3) {
        resolve({error: 'Too few rounds'});
      } else {
        const historyElement = rows.map((row) => {
          return { imageId: row.imageId, isCorrect: row.isCorrect === 1 };
        });
        resolve(historyElement);
      }
    });
  });
};

const MemeDAO = {
  getImageById,
  getCaptionById,
  getMemeById,
  getCaptionsByImage,
  getAllImages,
  getAllCaptions,
  saveHistory,
  getHistoryList,
  getHistoryElement,
};
export default MemeDAO;
