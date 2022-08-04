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

我们提供了两种方式修改 `thinbuilder` 编译属性：参数配置和文件配置。

1. **参数配置**

    ```javascript
    app.use(thinbuilder({alias:"thinbuilder",debug:true [,...params]}));
    ```

2. **文件配置**

    项目根目录下创建 `thin.config.json`文件，配置示例如下：

    ```json
    {
        "alias": "thinbuilder",
        "priority": [{ "path": "test", "files": ["y.js","subfolder/s.js"] }], 
        "mode": "folder" ,
        "debug": true,
        "minify": true,
        "cachetime": 600
    }
    ```

3. **参数说明**

    - ```alias```：定义thinjs根目录名称，用来存放thinjs文件，默认根目录为thinbuilder。
    
      ```json
      {
          ...
          "alias": "thinbuilder"
          ...
      }
      ```
    
    - ```debug```：调试日志开关，开启后控制台打印编译过程日志信息，默认为false。
    
      ```json
      {
          ...
          "debug": true
          ...
      }
      ```
    
    
    - ```minify```：启用脚本混淆/压缩开关，默认为false。
    
      ```json
      {
          ...
          "minify": true
          ...
      }
      ```
    
    - ```cachetime```：设置客户端缓存时间（秒），默认600秒。
    
      ```json
      {
          ...
          "cachetime": 600
          ...
      }
      ```
    
    - ```mode```：扫描模式，用来告诉编译器优先解析对象（folder|file），默认为folder。
    
      ```json
      {
          ...
          "mode": "folder"
          ...
      }
      ```
    
    - ```priority```：设置thinjs文件输出顺序（数组格式），默认编译顺序为文件名排序，该属性可以灵活调整thinjs文件加载顺序。[path]属性指定需要调整的文件夹路径，[files]属性指定优先输出的文件路径，支持子目录文件。
    
      注意：不建议“/”开头、字母大小写、文件路径填写顺序。
    
      ```json
      {
          ...
          "priority": [
              { 
               "path": "test", 
               "files": ["file2.js","subfolder/file1.js"] 
              }
          ]
          ...
      }
      ```
    
      
    

## Others

1. 我们推荐在项目根目录下使用 thinbuilder 作为 thinjs 脚本文件夹，当然早期的 jsbuilder 文件夹一样兼容。
2. Node Version >= 15.0.0。
3. 压缩/混淆功能目前为最基础功能，需要根据使用场景后续不断完善。
