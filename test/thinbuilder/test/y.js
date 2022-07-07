// y函数
function y() {
    console.log("This is a Y.");
}

/**
 * hello函数
 */
function hello() {
    let txt = ["你好，中国！", "你好，未来！", "你好，我的祖国！", "这是测试"];
    for (let item of txt) {
        if (item === "这是测试") continue;
        document.writeln(item);
    }
}
// 测试注释清除
/**
 * 测试贪婪模式匹配
 */
console.log();



console.error();
console.error("这是一条测试异常LOG！");
