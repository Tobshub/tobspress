# Tobspress - build nodejs HTTP REST APIs

## Installation
```bash
yarn add @tobshub/tobspress
```
OR
```bash
npm i @tobshub/tobspress
```

## Usage
Create a new instance of `Tobspress`
```javascript
import Tobspress from "@tobshub/tobspress";

const app = new Tobspress();
```

The `Tobspress` instance exposes method that will be familiar if you have used a similar library.

### Examples
```javascript
import Tobspress, {TobspressRouter} from "@tobshub/tobspress";

// existing code

const helloRouter = new TobspressRouter();

helloRouter.get("/world", (req, res) => {
  res.send("hello world");
});

app.use("/hello", {
  router: helloRouter, 
  handler: (req, res) => {
    res.send("hello");
  }
});

app.use("/", (req, res) => {
  res.sendFile("public/index.html");
});
```

<!-- TODO: API explanations -->
