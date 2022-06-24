# thinbuilder

基于 Express 的 THINJS 中间件，用来动态打包 thinjs 编写的脚本文件。

## Install

```console
npm install thinbuilder
```

## Usage

Express example

```console
......
const thinbuilder = require("thinbuilder");
......
app.use(express.static(path.join(__dirname, "public")));
app.use(thinbuilder());
```

## Others

我们推荐在项目根目录下使用 thinbuilder 作为 thinjs 脚本文件夹，当然早期的 jsbuilder 文件夹一样兼容。

另外如果用户喜欢个性化，我们也允许用户自定义文件夹名字，如下所示：

```console
app.use(thinbuilder({alias:"customFolder"}}));
```
