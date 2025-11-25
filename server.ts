import express from "express";
import fs from "fs";
import { join } from "path";
import { Jimp, ResizeStrategy, rgbaToInt } from "jimp";
import * as db from "./db";
import { getPixels } from "./training/train";
import { rateLimit } from "express-rate-limit";


const PRECISION = 3;
const MULT = 10 ** PRECISION;

const MAX_OPERATIONS = 5120;

const app = express();
app.use(express.static("static"));
app.set("trust proxy", true);

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
await newImage();

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

const f = (x: number) => Math.round(x * MULT);
const b = (x: number, op: 0 | 1) => op === 0 ? x / (MULT ** 2) : x / MULT;

let calculation: Calculation | null = null;
const nextCalculation = async () => {
    while(true) {
        calculation = getCalculation(db.calculationsForCur());
        if(calculation === null) {
            let max = -Infinity, maxi = -1, cur;
            for(let i = 0; i < 10; i++)
                if((cur = db.calculation(256 * 10 + 255 * 10 + i).res) > max) {
                    max = cur;
                    maxi = i;
                }
            db.solveImage(maxi);
            await newImage();
            continue;
        }
        if(calculation.a != 0 && calculation.b != 0) break;
        db.pushCalculation(calculation.a, calculation.b, calculation.op,
            calculation.op == 0 ? calculation.a * calculation.b : calculation.a + calculation.b);
    }
};
await nextCalculation();
const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    skip: () => !!process.env.BYPASS_RATE_LIMIT
});
app.get("/api/history", async (_req, res) => {
    res.send((await Promise.all((db.recent() as { data: string, correct: number, guess: number, start: number, end: number, auto: number }[]).map(async i => {
        const data = i.data.split(",").map(x => parseFloat(x));
        const img = new Jimp({ width: 16, height: 16 });
        for(let x = 0; x < 16; x++)
            for(let y = 0; y < 16; y++) {
                const v = 255 - Math.floor(data[y * 16 + x] * 255);
                img.setPixelColor(rgbaToInt(v, v, v, 255), x, y);
            }
        return {
            img: await img.getBase64("image/png"),
            correct: i.correct,
            guess: i.guess,
            start: i.start,
            end: i.end,
            auto: i.auto !== 0
        };
    }))).filter(x => x.guess !== -1));
    // TODO
});
app.get("/api/current", (_req, res) => {
    if(calculation === null) return;
    res.send({
        no: db.calculationsForCur(),
        a: f(calculation.a),
        b: f(calculation.b),
        op: calculation.op === 0 ? "*" : "+",
        progress: db.calculationsForCur() / MAX_OPERATIONS
    });
});
app.post("/api/solve", limiter, express.urlencoded({ extended: true, type: () => true }), async (req, res) => {
    if(calculation === null) return;
    if(!req.body.res) return res.status(400).send({ error: "Bad request" });
    const expected = b(calculation.op == 0 ? f(calculation.a) * f(calculation.b) : f(calculation.a) + f(calculation.b), calculation.op);
    const actual = b(parseInt(req.body.res), calculation.op);
    if(Math.abs(expected - actual) > 0.0001) return res.status(400).send({ error: "Incorrect value!" });

    db.pushCalculation(calculation.a, calculation.b, calculation.op, actual);
    await nextCalculation();

    res.redirect("/api/current");
});

app.listen(40067);