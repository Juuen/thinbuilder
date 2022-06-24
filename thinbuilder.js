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
    options = options || {};
    let alias = options.alias || "thinbuilder";

    // Default compile callback
    options.compile =
        options.compile ||
        function () {
            return thinbuilder;
        };

    return function thinbuilder(req, res, next) {
        let jspath = req.path;
        // 限定请求方式
        if (req.method !== "GET" && req.method !== "HEAD") {
            return next();
        }
        // 限定js文件
        if (!/\.js$/i.test(jspath)) {
            return next();
        }
        // 兼容早期jsbuilder文件夹，以及自定义文件夹
        let aliasReg = new RegExp(`jsbuilder|${alias}`, "gi");
        if (!aliasReg.test(jspath)) {
            return next();
        }

        jspath = jspath.substring(1); // 移除起始斜杠，不然会引起express路径解析错误
        jspath = jspath.replace(/\.js$/i, ""); // 获取需要打包的文件夹

        // 验证一下是否为文件夹，否则当做文件处理，可以解决引用单个thinjs文件情况。
        access(jspath, constants.F_OK | constants.R_OK, async (err) => {
            if (!err) {
                try {
                    await fileBuilder({ jspath, res });
                } catch (builderErr) {
                    console.error("builderErr: ", builderErr);
                }
                res.end();
            } else {
                jspath = path.resolve(__dirname, `${jspath}.js`);
                res.type(".js");
                res.sendFile(jspath, (e) => {
                    e && console.error(e);
                    return next();
                });
            }
        });
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
