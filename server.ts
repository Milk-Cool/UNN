import express from "express";
import fs from "fs";
import { join } from "path";
import { Jimp } from "jimp";
import * as db from "./db";


const app = express();
app.use(express.static("static"));

let model: { w: number[][], b: number[] };
try {
    model = JSON.parse(fs.readFileSync(join("training/weights/w.json"), "utf-8"));
} catch(_) {
    console.error("Model not found");
    process.exit(0);
}

const newImage = async () => {
    if(db.hasImage()) return;

    const n = Math.floor(Math.random() * 10);
    const a = fs.readdirSync(join("training", "dataset", n.toString()));
    const p = a[Math.floor(Math.random() * a.length)];
    const i = await Jimp.read(p);
}