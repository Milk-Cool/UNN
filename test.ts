(async () => {
    let res = await (await fetch("http://localhost:40067/api/current")).json();
    while(true) {
        console.log(res);
        res = await (await fetch("http://localhost:40067/api/solve", {
            method: "POST",
            body: "res=" + (res.op === "*" ? res.a * res.b : res.a + res.b).toString()
        })).json();
    }
})();