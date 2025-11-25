import express from "express";
import fs from "fs";
import { join } from "path";
import { Jimp, ResizeStrategy } from "jimp";
import * as db from "./db";
import { getPixels } from "./training/train";


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
    const p = join("training", "dataset", n.toString(), a[Math.floor(Math.random() * a.length)]);
    const im = await Jimp.read(p);
    im.resize({ w: 16, h: 16, mode: ResizeStrategy.BILINEAR });
    const i = getPixels(im);

    console.log(`New image: ${p} (${n})`);

    db.newImage(i, n);
    return i;
}

type Calculation = { a: number, b: number, op: 0 | 1 }; // op = 0 is multiplication, 1 is addition
const getCalculation = (x: number): (Calculation | null) => {
    if(x < 10 * 256) return { a: db.curImageData()[x % 256], b: model.w[Math.floor(x / 256) % 10][x % 256], op: 0 };
    x -= 10 * 256;
    if(x < 10 * 255) return {
        a: x % 255 == 0 ? db.calculation(Math.floor(x / 255) * 256).res : db.calculation(10 * 256 + x - 1).res,
        b: db.calculation(Math.floor(x / 255) * 256 + x % 255 + 1).res,
        op: 1
    };
    x -= 10 * 255;
    if(x < 10) return {
        a: model.b[x],
        b: db.calculation(10 * 256 + 255 * x + 254).res,
        op: 1
    }
    return null;
};

await newImage();
let i = 0;
while(true) {
    const c = getCalculation(i++);
    if(c === null) break;
    const res = c.op == 0 ? c.a * c.b : c.a + c?.b;
    db.pushCalculation(c.a, c.b, c.op, res);
}
for(let i = 0; i < 10; i++)
    console.log(`${i} - ${db.calculation(256 * 10 + 255 * 10 + i).res}`);