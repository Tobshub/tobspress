import Tobspress, { TobspressRouter } from "../src";

const app = new Tobspress();

app.static("public");

app.use("echo", async (req, res) => {
  const url = req.url.split("/").filter((path) => path !== "");
  // remove echo from the text
  url.shift();
  if (url.length) {
    res.send(url.join(" ").replace(/(%20)|\+/g, " "));
    return;
  }
  res.send({ message: "Append text to the url to make me say stuff!" });
});

app.post("form", async (req, res) => {
  console.log("body:", await req.body);
  res.send(await req.body);
});

app.use("/", async (req, res) => {
  res.sendFile("public/index.html");
});

app.listen(4000, () => console.log("live port(4000)"));