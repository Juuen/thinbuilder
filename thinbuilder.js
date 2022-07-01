"use strict";
const fs = require("fs");
const { readdir, readFile } = require("fs/promises");
const path = require("path");

/**
 *  thinbuilder
 * @param {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    console.log("==========thinbuilder is mounting==========");
    options ||= {};
    let thinConfig = {};

    // 加载THIN配置
    loadConfig("thin.config.json", (err, data) => {
        thinConfig = { ...options, ...data };
        thinConfig.alias ||= "thinbuilder"; // 初始化thin文件夹名
        thinConfig.debug ??= false; // 初始化调试开关
        thinConfig.compile ||= function () {
            return thinbuilder;
        };

        if (err && thinConfig.debug) console.error("thinConfig loading: ", err);
    });

    return function thinbuilder(req, res, next) {
        let jspath = req.path.substring(1);
        // 限定请求方式
        if (req.method !== "GET" && req.method !== "HEAD") return next();

        // 限定js文件
        if (!/\.js$/i.test(jspath)) return next();

        // 兼容早期jsbuilder文件夹，以及自定义文件夹
        let aliasReg = new RegExp(`jsbuilder|${thinConfig.alias}`, "gi");
        if (!aliasReg.test(jspath)) return next();

        // 检查编译对象优先项
        let mode = thinConfig.builder?.mode?.toLowerCase() || "folder";
        if (!["folder", "file"].includes(mode)) return next();

        let action = actions().get(mode);
        action.call(this, { res, next, ...thinConfig, jspath, mode });
    };
};

/**
 * JS文件合并处理器
 * @param {Object} p
 * jspath:  打包路径
 * res:     http response
 */
async function fileBuilder(p) {
    let subFolers = [],
        files = await readdir(p.jspath, { withFileTypes: true }),
        thinFolder_index = p.jspath.indexOf(p.alias),
        preBuilderPath = p.jspath.substring(thinFolder_index + p.alias.length + 1),
        preFolder = (p.builder?.priority || []).filter((item) => {
            if (item.path.startsWith("/")) item.path = item.path.substring(0);
            return item.path === preBuilderPath;
        });

    // 预配置文件打包
    for (const item of preFolder[0]?.files || []) {
        let fullname = `${p.jspath}/${item}`;
        const data = await readFile(fullname);
        p.res.write("\n\n// " + fullname + "\n\n");
        p.res.write(data);
    }

    // 正常打包
    for (const file of files) {
        let fullname = `${p.jspath}/${file.name}`;
        if (file.isFile()) {
            if ((preFolder[0]?.files || []).some((item, index) => item === file.name)) continue;
            const data = await readFile(fullname);
            p.res.write("\n\n// " + fullname + "\n\n");
            p.res.write(data);
        } else if (file.isDirectory()) {
            await fileBuilder({ jspath: `${p.jspath}/${file.name}`, res: p.res, next: p.next, builder: p.builder, alias: p.alias });
        } else {
            continue;
        }
    }
}

// 加载配置文件
async function loadConfig(p, callback) {
    let thinConfig = {},
        err;
    try {
        thinConfig = await readFile(p);
        thinConfig = JSON.parse(thinConfig);
    } catch (e) {
        err = e;
    }
    callback && callback(err, thinConfig ?? {});
}

// 打包任务管道
function actions() {
    const pipe_folder = async function (p) {
        let builderDir = p.jspath.replace(/\.js$/i, "");
        try {
            p.res.type(".js");
            await fileBuilder({ jspath: builderDir, res: p.res, next: p.next, builder: p.builder, alias: p.alias });
            return p.res.end();
        } catch (e) {
            if (e && p.debug) console.error("folder pipe: ", e);
            // 此处逻辑是为了避免递归异常导致总是进入渲染单独文件管道
            fs.access(builderDir, fs.constants.F_OK | fs.constants.R_OK, (err) => {
                if (err && p.mode === builderMode.folder) {
                    return pipe_file(p);
                } else return p.res.end();
            });
        }
    };

    const pipe_file = function (p) {
        p.res.type(".js");
        p.res.sendFile(path.join(__dirname, p.jspath), (e) => {
            if (e && p.debug) console.error("file pipe: ", e);
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
