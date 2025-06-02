document.addEventListener("DOMContentLoaded", () => {
  const text = "Hi, my name is Akira. Welcome to my website.";
  const output = document.getElementById("typed-text");
  let index = 0;

  function type() {
    if (index < text.length) {
      output.textContent += text.charAt(index);
      index++;
      setTimeout(type, 60); // typing speed
    }
  }

  type(); // start typing
});

window.addEventListener("load", () => {
  document.body.classList.add("page-loaded");
});