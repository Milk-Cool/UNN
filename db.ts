import Database from "better-sqlite3";

const db = new Database("data.db");
db.pragma("journal_mode = WAL");

db.prepare(`CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY,
    data TEXT,
    correct INTEGER,
    guess INTEGER,
    start INTEGER,
    end INTEGER
)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS calculations (
    id INTEGER PRIMARY KEY,
    image INTEGER,
    a INTEGER,
    b INTEGER,
    op INTEGER,
    res INTEGER
)`).run(); // op = 0 is multiplication, 1 is addition

export const hasImage = () => {
    return !!db.prepare(`SELECT * FROM images WHERE guess = -1 LIMIT 1`).get();
}
export const newImage = (image: number[], correct: number) => {
    db.prepare(`INSERT INTO images (data, correct, guess, start, end)
        VALUES (?, ?, ?, ?, ?)`).run(JSON.stringify(image), correct, -1, Date.now() / 1000, -1);
}