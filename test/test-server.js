const express = require("express");
const app = express();
const port = 3000;
const thinbuilder = require("../thinbuilder");
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
app.use(
    thinbuilder({
        alias: "thinbuilder",
        builder: {
            priority: [
                { path: "/test", files: ["/subtest/subtest.js", "y.js", "w.js"] },
                { path: "test/subtest/s2", files: ["s3/s3.js"] }
            ],
            mode: "folder"
        },
        debug: false,
        minify: false
    })
);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
