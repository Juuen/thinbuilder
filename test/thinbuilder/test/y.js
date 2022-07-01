function y() {
    console.log("This is a Y.");
}

function hello() {
    let txt = ["你好，中国！", "你好，未来！", "你好，我的祖国！", "这是测试"];
    for (let item of txt) {
        if (item === "这是测试") continue;
        document.writeln(item);
    }
}
