import Tobspress, { TobspressRouter } from "./index";

const app = new Tobspress();

app.static("public");

app.use("hello", {
  handler: async (req, res) => {
    res.send({ message: "hi there!" });
  },
});

app.post("form", {
  handler: async (req, res) => {
    console.log("body:", await req.body);
    res.send(await req.body);
  },
});

app.use("/", {
  handler: async (req, res) => {
    res.send("public/index.html", { type: "path", extention: ".html" });
  },
});

app.listen(4000, () => console.log("live port(4000)"));
