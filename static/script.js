(async () => {
    let tok;
    const widgetID = turnstile.render("#cf", {
        sitekey: SITE_KEY,
        callback: newtok => tok = newtok
    });

    let res = await (await fetch("/api/current")).json();

    const update = () => {
        const sign = res.op === "*" ? "×" : "+";
        document.querySelector("#expr").innerText = `${res.a} ${sign} ${res.b}`;
        document.querySelector("#percent").innerText = (res.progress * 100).toFixed(2);
    }
    update();

    const submit = async () => {
        document.querySelector("#submit").disabled = true;
        const f = await fetch("/api/solve", {
            method: "POST",
            body: new URLSearchParams({
                "res": document.querySelector("#res").value,
                tok
            }).toString()
        });
        document.querySelector("#submit").disabled = false;
        if(f.status !== 200) alert(f.status === 429 ? "Nice try, bot" : (await f.json()).error);
        res = await f.json();
        update();
        document.querySelector("#res").value = "";
        turnstile.reset(widgetID);
    };
    document.querySelector("#submit").addEventListener("click", submit);
    document.querySelector("#res").addEventListener("keydown", e => {
        if(e.key !== "Enter") return;
        submit();
    });
    setInterval(async () => {
        res = await (await fetch("/api/current")).json();
        update();
    }, 2000);

    const updateRecent = async () => {
        const recent = await fetch("/api/history");
        if(recent.status !== 200) return;
        const r = await recent.json();
        for(const c of Array.from(document.querySelector("#recent").children)) {
            if(c.tagName.toLowerCase() !== "h3") c.remove();
        }
        for(const item of r) {
            const div = document.createElement("div");
            
            const img = document.createElement("img");
            img.src = item.img;
            div.appendChild(img);

            div.appendChild(document.createElement("br"));

            const t = document.createElement("pre");
            const time = item.end - item.start;
            t.innerText = `Actual: ${item.correct}\nRecognized: ${item.guess}\nIn: ${Math.floor(time / 3600)}h${Math.floor(time / 60) % 60}m${item.auto ? "\n[Automatic]" : ""}`;
            div.appendChild(t);

            document.querySelector("#recent").append(div);
        }
    };
    updateRecent();
    setInterval(updateRecent, 30000);

    document.querySelector("#hide").addEventListener("click", () => document.querySelector("#recent").style.display = "none");
})();