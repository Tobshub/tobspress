import Tobspress from "@tobshub/tobspress";

const app = new Tobspress();

app.use("/", (req, res) => {
  res.sendFile("index.html");
});

app.listen(4000, () => {
  console.log("LIVE port(4000)");
});
