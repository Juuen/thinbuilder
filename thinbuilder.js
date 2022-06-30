"use strict";
const { constants, access } = require("fs");
const { readdir, readFile } = require("fs/promises");
const path = require("path");

/**
 *  thinbuilder
 * @param {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    console.log("==========thinbuilder is mounting==========");
    options = options || {};
    let alias = options.alias || "thinbuilder";

    // Default compile callback
    options.compile =
        options.compile ||
        async function () {
            return await thinbuilder;
        };

    return async function thinbuilder(req, res, next) {
        let jspath = req.path,
            thinConfig = {};

        // 限定请求方式
        if (req.method !== "GET" && req.method !== "HEAD") return next();

        // 限定js文件
        if (!/\.js$/i.test(jspath)) return next();

        // 兼容早期jsbuilder文件夹，以及自定义文件夹
        let aliasReg = new RegExp(`jsbuilder|${alias}`, "gi");
        if (!aliasReg.test(jspath)) return next();

        thinConfig = await loadConfig();

        // 移除起始斜杠，不然会引起express路径解析错误
        jspath = jspath.substring(1);

        let mode = thinConfig.builder?.mode?.toLowerCase() || "folder";
        if (!["folder", "file"].includes(mode)) return next();

        let action = actions().get(mode);
        action.call(this, { res, next, jspath, mode });
    };
};

/**
 * JS文件合并处理器
 * @param {Object} p
 * jspath:  打包路径
 * res:     http response
 */
async function fileBuilder(p) {
    p.res.type(".js");
    let subFolers = [];
    console.log(p.jspath);
    let files = await readdir(p.jspath, { withFileTypes: true });
    for (const file of files) {
        let fullname = `${p.jspath}/${file.name}`;
        if (file.isFile()) {
            const data = await readFile(fullname);
            p.res.write("\n\n// " + fullname + "\n\n");
            p.res.write(data);
        } else if (file.isDirectory()) {
            await fileBuilder({ jspath: `${p.jspath}/${file.name}`, res: p.res });
        } else {
            continue;
        }
    }
}

async function loadConfig() {
    let thinConfig = await readFile("thin.config.json");
    return JSON.parse(thinConfig);
}

function actions() {
    const pipe_folder = async function (p) {
        let builderDir = p.jspath.replace(/\.js$/i, "");
        try {
            await fileBuilder({ jspath: builderDir, res: p.res, next: p.next });
            return p.res.end();
        } catch (e) {
            e && console.error(e);
            // 此处逻辑是为了避免递归异常导致进入渲染单独文件管道
            access(builderDir, constants.F_OK | constants.R_OK, (err) => {
                if (err && p.mode === builderMode.folder) {
                    return pipe_file(p);
                } else return p.res.end();
            });
        }
    };

    const pipe_file = function (p) {
        p.res.type(".js");
        p.res.sendFile(path.join(__dirname, p.jspath), (e) => {
            e && console.error(e);
            return p.mode === builderMode.file ? pipe_folder(p) : p.next();
        });
    };

    return new Map([
        ["folder", pipe_folder],
        ["file", pipe_file]
    ]);
}

const builderMode = Object.freeze({
    folder: "folder",
    file: "file"
});
