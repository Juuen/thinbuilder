"use strict";
var express = require("express");
var router = express.Router();
const fs = require("fs");
const babel = require("@babel/core");
const browserify = require("browserify");
const babelify = require("babelify");
const builder = require("core-js-builder");
/* GET users listing. */
router.get("/", function (req, res) {
    res.send("jsbuilder");
});

router.get("/:dir.js", function (req, res) {
    let path = "jsbuilder/".concat(req.params.dir);
    res.type(".js");
    function dirwalker(path, fininshed) {
        // console.log({
        //     pos: "dirwalker",
        //     path: path
        // });
        fs.readdir(path, { withFileTypes: true }, function (err, items) {
            if (!err) {
                //console.log(items);
                var dirs = [];
                var i = 0;
                var j = 0;
                walker();

                // let files = items.map((item, index, arr) => {
                //     return path + "/" + item.name;
                // });
                // browserify({
                //     // standalone: "jbd",
                //     plugin: [[require("esmify")]]
                // })
                //     .plugin(standalonify, {
                //         name: "jsbuilder", //or set such as "['moduleName1', 'moduleName2']", can set more than one module name.
                //         deps: {},
                //         hasAmdDeps: false //If set to false will not generate amd dependency.
                //     })
                //     .transform(babelify, {
                //         presets: ["@babel/preset-env"],
                //         plugins: [
                //             [
                //                 "@babel/plugin-transform-runtime",
                //                 {
                //                     corejs: { version: 3, proposals: true },
                //                     helpers: true,
                //                     useESModules: true,
                //                     regenerator: true
                //                 }
                //             ]
                //         ]
                //     })
                //     .require(files, { entry: true })
                //     .bundle()
                //     .on("error", function (err) {
                //         console.log("Error: " + err.message);
                //         res.end();
                //     })
                //     .on("data", (chunk) => {
                //         console.log(chunk);
                //         // res.write("\n\n//  " + fullname + "\n\n");
                //         // res.type('.js');
                //         res.write(chunk);
                //         res.end();
                //         // i += 1;
                //         // walker();
                //     });

                function walker() {
                    if (i < items.length) {
                        var item = items[i];
                        var fullname = path + "/" + item.name;
                        if (item.isFile()) {
                            fs.readFile(fullname, function (err, data) {
                                // console.log({
                                //     pos: "file readed",
                                //     i: i,
                                //     fullname: fullname,
                                //     err: err,
                                //     data: data
                                // });
                                babel.transform(
                                    data,
                                    {
                                        presets: ["@babel/preset-env"]
                                    },
                                    function (err, result) {
                                        res.write("\n\n//  " + fullname + "\n\n");

                                        // const bundle = await builder({
                                        //     modules: ["es", "esnext.reflect", "web"],
                                        //     exclude: ["es.math", "es.number.constructor"],
                                        //     targets: "> 0.5%, not dead, ie 9-11",
                                        //     summary: {
                                        //         console: { size: true, modules: false },
                                        //         comment: { size: false, modules: true }
                                        //     }
                                        // });

                                        res.write(result.code);
                                        i += 1;
                                        walker();
                                    }
                                );
                            });
                        } else if (item.isDirectory()) {
                            // console.log({
                            //     pos: "isdir", i: i,
                            //     fullname: fullname
                            // });
                            dirs.push(fullname);
                            i += 1;
                            walker();
                        }
                    } else if (j < dirs.length) {
                        // console.log({
                        //     pos: "dir", j: j,
                        //     fullname: dirs[j]
                        // });
                        dirwalker(dirs[j], function () {
                            j += 1;
                            walker();
                        });
                    } else {
                        fininshed();
                    }
                }
            } else {
                res.status(404);
                res.send("file not found!");
                res.end();
            }
        });
    }

    dirwalker(path, function () {
        res.end();
    });
});

module.exports = router;
