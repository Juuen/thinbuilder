"use strict";
const fs = require("fs");
const { readdir, readFile } = require("fs/promises");
const path = require("path");
const { minify } = require("terser");

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
        thinConfig.minify ??= false; // 初始化文件压缩开关
        thinConfig.cachetime ??= 600; // 初始化缓存时间
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
            if (item.path.startsWith("/")) item.path = item.path.substring(1);
            return item.path === preBuilderPath;
        });

    // 预配置文件打包
    for (const item of preFolder[0]?.files || []) {
        let fullname = `${p.jspath}/${item}`;
        await outputContent({ ...p, fullname });
    }

    // 正常打包
    for (const file of files) {
        if (file.isFile()) {
            if ((preFolder[0]?.files || []).some((item, index) => item === file.name)) continue;
            let fullname = `${p.jspath}/${file.name}`;
            await outputContent({ ...p, fullname });
        } else if (file.isDirectory()) {
            await fileBuilder({ ...p, jspath: `${p.jspath}/${file.name}` });
        } else {
            continue;
        }
    }
}

// 加载配置文件
function loadConfig(configfile, callback) {
    let thinConfig = {},
        configErr;

    fs.access(configfile, fs.constants.F_OK | fs.constants.R_OK, async (err) => {
        if (!err) {
            try {
                thinConfig = await readFile(configfile);
                thinConfig = JSON.parse(thinConfig);
            } catch (e) {
                configErr = e;
            }
        }
        callback && callback(configErr, thinConfig ?? {});
    });
}

// 打包任务管道
function actions() {
    const pipe_folder = async function (p) {
        let builderDir = p.jspath.replace(/\.js$/i, "");
        try {
            p.res.type(".js");
            p.res.set("Cache-Control", `public, max-age=${p.cachetime}`);
            await fileBuilder({ ...p, jspath: builderDir });
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
        p.res.sendFile(path.join(__dirname, p.jspath), { maxAge: p.cachetime * 1000 }, (e) => {
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

/**
 * 向浏览器输出脚本文件内容
 * @param {Object} p
 */
async function outputContent(p) {
    let data = await readFile(p.fullname);
    if (p.minify) {
        data = await minify(data.toString(), {});
        data = data.code;
    }
    p.res.write("\n// " + p.fullname + "\n");
    p.res.write(data);
}
