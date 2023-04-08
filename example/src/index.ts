import Tobspress from "@tobshub/tobspress";

const app = new Tobspress();

app.use("/", (req, res) => {
  res.sendFile("index.html");
});

app.use("echo", (req, res) => {
  const url = req.url.split("/").filter((path) => path !== "");
  // remove echo from the text
  url.shift();
  if (url.length) {
    res.send(url.join(" ").replace(/(%20)|\+/g, " "));
    return;
  }
  res.send({ message: "Append text to the url to make me say stuff!" });
});

app.listen(4000, () => {
  console.log("LIVE port(4000)");
});
