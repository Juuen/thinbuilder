# thinbuilder

基于 Express 的 [THINJS](http://thinjs.com/) 中间件，用来动态打包 THINJS 编写的 JAVASCRIPT 脚本文件。

[![npm version](https://badge.fury.io/js/thinbuilder.svg)](https://badge.fury.io/js/thinbuilder)

## Install

```console
npm install thinbuilder
```

## Usage

#### Express 引用示例

```javascript
......
const thinbuilder = require("thinbuilder");
......
app.use(express.static(path.join(__dirname, "public")));
app.use(thinbuilder());
......
```

#### 修改配置

我们提供了两种方式修改 `thinbuilder` 配置：配置参数和配置文件。

1. **配置参数**

    ```javascript
    app.use(thinbuilder({alias:"thinbuilder",debug:true [,...params]}));
    ```

2. **配置文件**

    项目根目录下创建 `thin.config.json`文件，配置示例如下：

    ```json
    {
        "alias": "thinbuilder",
        "builder": { "priority": [{ "path": "test", "files": ["y.js"] }], "mode": "folder" },
        "debug": true,
        "minify": true,
        "cachetime": 600
    }
    ```

3. **参数说明**

    ```console
    alias			存放thinjs顶层文件夹，默认为thinbuilder
    debug			开启调试日志，默认为false
    builder/mode		打包thinjs优先处理对象（folder|file），默认为folder，该参数解决极端场景同目录下文件夹与文件同名优先输出谁的问题。
    builder/priority	用来提升指定文件夹内文件输出优先次序，解决网络延迟导致引用方法所在的文件后加载引发的异常。
    priority/path		指定调整顺序的文件夹，相对于thinbuilder内的文件夹路径，注意不能以“/”开头、字母大小写。
    priority/files		需要调整顺序的文件，填写文件名即可，数组形式存储，注意区分顺序、字母大小写。
    minify			是否启用混淆/压缩，默认为false。
    cachetime		设置HTTP缓存时间（秒），默认600秒。

    ```

## Others

1. 我们推荐在项目根目录下使用 thinbuilder 作为 thinjs 脚本文件夹，当然早期的 jsbuilder 文件夹一样兼容。
2. Node Version >= 15.0.0。
3. 压缩/混淆功能目前为最基础功能，需要根据使用场景后续不断完善。
