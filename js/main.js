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

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const message = document.getElementById("message").value.trim();

      console.log("Form Submitted:");
      console.log("Name:", name);
      console.log("Email:", email);
      console.log("Message:", message);

      // 🔮 FUTURE DISCORD INTEGRATION GOES HERE
      alert("Thank you! This form is ready for Discord bot integration. 📨");

      form.reset();
    });
  }
});
