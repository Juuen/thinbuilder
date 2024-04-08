"use strict";
const path = require("path");
const { readdir, readFile } = require("fs/promises");
const { minify } = require("terser");

const CONFIG_FILE = "thin.config.json";
const CONFIG_DEFAULT = {
	alias: "thinbuilder" // 初始化thin文件夹名
};
var thinConfig = {};

/**
 *  thinbuilder
 * @param {Object} options 配置参数
 * @return {Function}
 */
module.exports = function (options) {
	// 加载THIN配置，配置文件优先级最高
	thinConfig = { ...CONFIG_DEFAULT, ...options };
	loadConfig(CONFIG_FILE);

	// 初始化中间件
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
	files.sort((a, b) => b.isFile() - a.isFile()); // 文件夹内文件优先于子文件夹输出

	for (const file of files) {
		if (file.isFile()) {
			let fullname = `${p.jspath}/${file.name}`;
			if (!fullname.endsWith(".js")) continue; // 仅输出JS文件
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
 * @param {String} configfile 配置文件路径
 */
async function loadConfig(configfile) {
	try {
		let config = JSON.parse(await readFile(configfile));
		thinConfig = { ...thinConfig, ...config };
	} catch (err) {}

	// 未配置时,根据环境变量设定初始值
	thinConfig.debug ??= process.env.NODE_ENV === "production" ? false : true;
	thinConfig.minify ??= process.env.NODE_ENV === "production" ? true : false;

	console.log("[thinbuilder] The thinbuilder has been successfully mounted.");
}

/**
 * Builder任务管道
 * @returns {Map}
 */
function actions() {
	const pipe_folder = async function (p) {
		try {
			let builderDir = p.jspath.replace(/\.js$/i, "");
			setHeaders(p);
			await fileBuilder({ ...p, jspath: builderDir });
			return p.res.end();
		} catch (err) {
			if (err && p.debug) console.error("[thinbuilder] folder pipe: ", err);
			// 此处逻辑是为了避免递归异常导致总是进入渲染单独文件管道
			return p.mode === builderMode.folder ? await pipe_file(p) : p.next();
		}
	};

	const pipe_file = async function (p) {
		try {
			setHeaders(p);
			await outputContent({ ...p, fullname: path.resolve(p.jspath) });
			return p.res.end();
		} catch (err) {
			if (err && p.debug) console.error("[thinbuilder] file pipe: ", err);
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
 * 向浏览器输出THINJS
 * @param {Object} p
 */
async function outputContent(p) {
	let data = (await readFile(p.fullname))?.toString() ?? "";
	if (!p.debug) data = dataPreCheck(data);
	if (p.minify) {
		data = await minify(data, { format: { comments: false }, compress: { drop_console: true, drop_debugger: true, sequences: false }, mangle: true }); // 参数待完善
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
	d = d.replace(/\r/g, ""); // 移除回车符
	d = d.replace(/\n{2,}/g, "\n"); // 合并换行符
	d = d.trim();
	d = d.endsWith(";") ? d : d.concat(";");
	return d;
}

/**
 * 设置HTTP响应头
 * @param {Object} p Builder参数集
 */
function setHeaders(p) {
	p.res.type(".js");
	p.cachetime && p.res.set("Cache-Control", `public, max-age=${p.cachetime}`);
}
