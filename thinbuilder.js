"use strict";
var express = require("express");
var router = express.Router();
const { constants } = require("fs");
const { access, readdir, readFile } = require("fs/promises");

router.get("/", function (req, res) {
    res.send("thinbuilder");
});

router.get("/:dir.js", async function (req, res) {
    let dirBase = "";
    try {
        await access("thinbuilder", constants.F_OK | constants.R_OK);
        dirBase = "thinbuilder";
    } catch {}
    if (!dirBase) {
        try {
            await access("jsbuilder", constants.F_OK | constants.R_OK);
            dirBase = "jsbuilder";
        } catch {}
    }

    if (!dirBase) {
        res.send(`The folder "thinbuilder" cannot found!`);
    } else {
        let path = `${dirBase}/${req.params.dir}`;
        await dirWorker({ path, res });
        res.end();
    }
});

// JS文件合并处理器
let dirWorker = async function (p) {
    try {
        p.res.type(".js");
        let files = await readdir(p.path, { withFileTypes: true });
        for (const file of files) {
            let fullname = `${p.path}/${file.name}`;
            if (file.isFile()) {
                const controller = new AbortController();
                const { signal } = controller;
                const data = await readFile(fullname, { signal });
                p.res.write("\n\n// " + fullname + "\n\n");
                p.res.write(data);
            } else if (file.isDirectory()) {
                dirWorker({ path: `${p.path}/${file.name}`, res: p.res });
            } else {
                continue;
            }
        }
    } catch (err) {
        console.error(err);
    }
};

module.exports = router;
