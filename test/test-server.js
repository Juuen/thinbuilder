const express = require("express");
const app = express();
const port = 3000;
const thinbuilder = require("../thinbuilder");
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
app.use(thinbuilder());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
