"use strict";
const fs = require("fs");
const path = require("path");
const { readdir, readFile } = require("fs/promises");
const { minify } = require("terser");

/**
 *  thinbuilder
 * @param {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    let thinConfig = {};
    options ||= {};

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

        if (process.env.NODE_ENV === "production") thinConfig.debug = false; // 生产环境强制禁用调试日志开关
        if (err && thinConfig.debug) console.error("[thinbuilder] thinConfig loading: ", err);
        console.log("[thinbuilder] thinbuilder is mounted.");
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
        let mode = thinConfig.mode?.toLowerCase() || "folder";
        if (!["folder", "file"].includes(mode)) return next();

        let action = actions().get(mode);
        action.call(this, { res, next, ...thinConfig, jspath, mode });
    };
};

/**
 * JS文件合并处理器
 * @param {Object} p
 */
async function fileBuilder(p) {
    let files = await readdir(p.jspath, { withFileTypes: true }),
        preBuilderPath = p.jspath.substring(p.jspath.indexOf(p.alias) + p.alias.length + 1),
        preFolder = (p.priority || []).filter((item) => item.path.replace(/^\//, "") === preBuilderPath); // 含有预编译文件的文件夹

    // 子目录文件缓存
    p.fileFilters ||= [];

    // 预编译文件优先输出
    for (let item of preFolder[0]?.files || []) {
        item = item.replace(/^\//, "");
        if (item.includes("/") && !p.fileFilters.includes(item)) p.fileFilters.push(item);
        let fullname = `${p.jspath}/${item}`;
        await outputContent({ ...p, fullname });
    }

    // 正常输出文件
    for (const file of files) {
        if (file.isFile()) {
            let fullname = `${p.jspath}/${file.name}`;
            if ([...new Set([...(preFolder[0]?.files || []), ...p.fileFilters])].some((item, index) => fullname.endsWith(item))) continue;
            await outputContent({ ...p, fullname });
        } else if (file.isDirectory()) {
            await fileBuilder({ ...p, jspath: `${p.jspath}/${file.name}` });
        } else {
            continue;
        }
    }
}

/**
 * 加载配置文件
 * @param {String} configfile
 * @param {Function} callback
 */
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

/**
 * Builder任务管道
 * @returns {Map}
 */
function actions() {
    const pipe_folder = async function (p) {
        try {
            let builderDir = p.jspath.replace(/\.js$/i, "");
            p.res.type(".js");
            p.res.set("Cache-Control", `public, max-age=${p.cachetime}`);
            await fileBuilder({ ...p, jspath: builderDir });
            return p.res.end();
        } catch (e) {
            if (e && p.debug) console.error("[thinbuilder] folder pipe: ", e);
            // 此处逻辑是为了避免递归异常导致总是进入渲染单独文件管道
            return p.mode === builderMode.folder ? await pipe_file(p) : p.next();
        }
    };

    const pipe_file = async function (p) {
        try {
            p.res.type(".js");
            p.res.set("Cache-Control", `public, max-age=${p.cachetime}`);
            await outputContent({ ...p, fullname: path.resolve(p.jspath) });
            return p.res.end();
        } catch (e) {
            if (e && p.debug) console.error("[thinbuilder] file pipe: ", e);
            return p.mode === builderMode.file ? await pipe_folder(p) : p.next();
        }
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
    let data = (await readFile(p.fullname))?.toString() ?? "";
    if (!p.debug) data = dataPreCheck(data);
    if (p.minify) {
        data = await minify(data, { compress: { sequences: false } }); // 参数待完善
        data = data.code;
    }
    p.debug && p.res.write(`\n// ${p.fullname}\n`);
    p.res.write(data);
}

/**
 * 预处理脚本文件，清除非必要性信息、敏感信息。
 * @param {String} d
 * @returns {String}
 */
function dataPreCheck(d) {
    if (!d) return d;
    d = d.replace(/\/\/.+|\/\*[\s\S]+?\*\//g, ""); // 移除注释
    d = d.replace(/console\.log\([\s\S]*?\);?/g, ""); // 移除console.log | 但保留console.error
    d = d.replace(/\r/g, ""); // 移除回车符
    d = d.replace(/\n{2,}/g, "\n"); // 合并换行符
    d = d.trim().concat("\n");
    d = d.endsWith(";") ? d : d.concat(";");
    return d;
}
