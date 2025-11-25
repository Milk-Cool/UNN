import Database from "better-sqlite3";

const db = new Database("data.db");
db.pragma("journal_mode = WAL");

db.prepare(`CREATE TABLE IF NOT EXISTS images (
    id INTEGER PRIMARY KEY,
    data TEXT,
    correct INTEGER,
    guess INTEGER,
    start INTEGER,
    end INTEGER,
    auto INTEGER
)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS calculations (
    id INTEGER PRIMARY KEY,
    image INTEGER,
    n INTEGER,
    a INTEGER,
    b INTEGER,
    op INTEGER,
    res INTEGER
)`).run(); // op = 0 is multiplication, 1 is addition

export const curImageID = (): number => {
    return (db.prepare(`SELECT id FROM images WHERE guess = -1 LIMIT 1`).get() as { id: number }).id;
}
export const curImageData = (): number[] => {
    return JSON.parse((db.prepare(`SELECT data FROM images WHERE guess = -1 LIMIT 1`).get() as { data: string }).data);
}
export const hasImage = () => {
    return !!db.prepare(`SELECT * FROM images WHERE guess = -1 LIMIT 1`).get();
}
export const newImage = (image: number[], correct: number, auto = false) => {
    db.prepare(`INSERT INTO images (data, correct, guess, start, end, auto)
        VALUES (?, ?, ?, ?, ?, ?)`).run(JSON.stringify(image), correct, -1, Math.floor(Date.now() / 1000), -1, auto ? 1 : 0);
}

export const calculationsForCur = () => {
    return Object.values(db.prepare(`SELECT COUNT(*) FROM calculations WHERE image = ?`).get(curImageID()) as object)[0];
}
export const calculation = (n: number): { id: number, image: number, n: number, a: number, b: number, op: number, res: number } => {
    return db.prepare(`SELECT * FROM calculations WHERE image = ? AND n = ?`).get(curImageID(), n) as ReturnType<typeof calculation>;
}
export const pushCalculation = (a: number, b: number, op: 0 | 1, res: number) => {
    db.prepare(`INSERT INTO calculations (image, n, a, b, op, res)
        VALUES (?, ?, ?, ?, ?, ?)`).run(curImageID(), calculationsForCur(), a, b, op, res);
}

export const solveImage = (guess: number) => {
    db.prepare(`UPDATE images SET guess = ?, end = ? WHERE guess = -1`).run(guess, Math.floor(Date.now() / 1000));
}