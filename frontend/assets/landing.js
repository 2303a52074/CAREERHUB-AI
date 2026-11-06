(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#primary-navigation");

  const setMenuOpen = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  };

  menuButton?.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 901px)").matches) setMenuOpen(false);
  });

  const samples = {
    interview: {
      context: "Interview practice",
      label: "BEHAVIORAL QUESTION",
      heading: "Tell me about a time you had to learn something unfamiliar to complete a project.",
      copy: "A useful answer gives context, explains the actions you took, and reflects on what changed as a result."
    },
    skills: {
      context: "Skill gap reflection",
      label: "ILLUSTRATIVE SKILL FOCUS",
      heading: "Choose one target role and compare its requirements with skills you can demonstrate.",
      copy: "For example, a learner interested in backend work might review API design, data modeling, and testing through a project they can explain."
    },
    roadmap: {
      context: "Learning roadmap",
      label: "ILLUSTRATIVE MILESTONE",
      heading: "Build and document a small project that demonstrates one target skill.",
      copy: "Define a practical outcome, set a finish point you can verify, and capture what you learned for your portfolio."
    }
  };
  const sampleButtons = document.querySelectorAll(".sample-tab");
  sampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const sample = samples[button.dataset.sample];
      if (!sample) return;
      sampleButtons.forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-pressed", String(active));
      });
      document.querySelector("#sample-context").textContent = sample.context;
      document.querySelector("#sample-label").textContent = sample.label;
      document.querySelector("#sample-heading").textContent = sample.heading;
      document.querySelector("#sample-copy").textContent = sample.copy;
    });
  });

  document.querySelector("#copyright-year").textContent = String(new Date().getFullYear());
})();
