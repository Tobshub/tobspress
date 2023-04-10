console.log("hi there <3");

const button = document.getElementById("js-button");

button.onclick = async () => {
  await fetch("/echo/hello/world")
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    });
};

const form = document.getElementById("form");
const input = document.getElementById("input");

if (form instanceof HTMLFormElement) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value;
    if (!text.length) return;
    const body = JSON.stringify({ input: input.value });
    await fetch("/api/form", { method: "POST", body })
      .then((res) => res.json())
      .then(console.log);
  };
}
