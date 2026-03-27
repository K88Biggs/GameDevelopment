/* global confetti, Sortable */

// SECTION: Game Data
// Focus on farm animals and the foods they eat
const ROUNDS = [
  [
    { id: "cow", label: "Cow", emoji: "🐮", foodId: "hay" },
    { id: "pig", label: "Pig", emoji: "🐷", foodId: "corn" },
    { id: "chicken", label: "Chicken", emoji: "🐔", foodId: "seeds" },
  ],
  [
    { id: "sheep", label: "Sheep", emoji: "🐑", foodId: "grass" },
    { id: "horse", label: "Horse", emoji: "🐴", foodId: "apple" },
    { id: "goat", label: "Goat", emoji: "🐐", foodId: "leaf" },
  ],
];

const FOODS = {
  hay: { id: "hay", label: "Hay", emoji: "🌾" },
  corn: { id: "corn", label: "Corn", emoji: "🌽" },
  seeds: { id: "seeds", label: "Seeds", emoji: "🌰" },
  grass: { id: "grass", label: "Grass", emoji: "🌿" },
  apple: { id: "apple", label: "Apple", emoji: "🍎" },
  leaf: { id: "leaf", label: "Leaves", emoji: "🍃" },
};

// SECTION: State
let currentRoundIndex = 0;
let matchesInRound = 0;
let selectedFoodId = null; // for tap-to-select

// SECTION: DOM Elements
const animalGrid = document.getElementById("animalGrid");
const foodGrid = document.getElementById("foodGrid");
const matchCountEl = document.getElementById("matchCount");
const totalMatchesEl = document.getElementById("totalMatches");
const feedbackEl = document.getElementById("feedback");
const nextRoundButton = document.getElementById("nextRoundButton");
const resetButton = document.getElementById("resetButton");
const roundLabel = document.getElementById("roundLabel");

// SECTION: Utilities
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function setFeedback(message, mood = "soft") {
  feedbackEl.textContent = message;
  feedbackEl.className = "controls__message"; // reset to base

  if (mood === "success") {
    feedbackEl.classList.add("controls__message--success");
  } else if (mood === "error") {
    feedbackEl.classList.add("controls__message--error");
  } else {
    feedbackEl.classList.add("controls__message--soft");
  }
}

function fireConfetti() {
  if (typeof confetti !== "function") return;
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    scalar: 0.9,
  });
}

// SECTION: Rendering
function createAnimalCard(animal) {
  const btn = document.createElement("button");
  btn.className = "card card--animal";
  btn.dataset.animalId = animal.id;
  btn.dataset.correctFoodId = animal.foodId;
  btn.type = "button";
  btn.setAttribute("aria-label", `${animal.label} slot`);

  btn.innerHTML = `
    <span class="card__emoji" aria-hidden="true">${animal.emoji}</span>
    <span class="card__label">${animal.label}</span>
    <span class="card__slot" aria-hidden="true"></span>
  `;

  btn.addEventListener("click", () => {
    if (!selectedFoodId) return;
    handleMatchAttempt(selectedFoodId, btn);
  });

  return btn;
}

function createFoodCard(food) {
  const div = document.createElement("button");
  div.className = "card card--food";
  div.dataset.foodId = food.id;
  div.type = "button";
  div.setAttribute("aria-pressed", "false");

  div.innerHTML = `
    <span class="card__emoji" aria-hidden="true">${food.emoji}</span>
    <span class="card__label">${food.label}</span>
  `;

  div.addEventListener("click", () => {
    if (div.classList.contains("card--disabled")) return;
    // toggle selection
    const isSelected = div.classList.contains("card--selected");
    clearFoodSelection();
    if (!isSelected) {
      selectedFoodId = food.id;
      div.classList.add("card--selected");
      div.setAttribute("aria-pressed", "true");
      setFeedback("Now tap a farm animal.", "soft");
    } else {
      selectedFoodId = null;
    }
  });

  return div;
}

function clearFoodSelection() {
  selectedFoodId = null;
  const foods = foodGrid.querySelectorAll(".card--food");
  foods.forEach((el) => {
    el.classList.remove("card--selected");
    el.setAttribute("aria-pressed", "false");
  });
}

function renderRound() {
  const animals = ROUNDS[currentRoundIndex];
  matchesInRound = 0;
  selectedFoodId = null;

  // Status
  totalMatchesEl.textContent = animals.length.toString();
  matchCountEl.textContent = "0";
  roundLabel.textContent = `Round ${currentRoundIndex + 1}`;
  nextRoundButton.disabled = currentRoundIndex >= ROUNDS.length - 1;

  // Clear grids
  animalGrid.innerHTML = "";
  foodGrid.innerHTML = "";

  // Render animals
  animals.forEach((animal) => {
    const card = createAnimalCard(animal);
    animalGrid.appendChild(card);
  });

  // Render foods (shuffled)
  const roundFoodIds = animals.map((a) => a.foodId);
  const roundFoods = shuffle(roundFoodIds).map((id) => FOODS[id]);

  roundFoods.forEach((food) => {
    const card = createFoodCard(food);
    foodGrid.appendChild(card);
  });

  // Re-init drag-and-drop
  initDragAndDrop();

  setFeedback("Pick a snack and match it to a farm animal.", "soft");
}

// SECTION: Matching Logic
function handleMatchAttempt(foodId, animalButton) {
  const correctFoodId = animalButton.dataset.correctFoodId;
  if (!correctFoodId) return;

  const foodButton = foodGrid.querySelector(`[data-food-id="${foodId}"]`);
  if (!foodButton || foodButton.classList.contains("card--disabled")) return;

  clearAnimalMatchStyles(animalButton);

  if (foodId === correctFoodId) {
    // Correct
    animalButton.classList.add("card--match-correct");
    foodButton.classList.add("card--disabled", "card--match-correct");
    foodButton.setAttribute("aria-disabled", "true");

    // Place emoji in slot for visual pairing
    const slot = animalButton.querySelector(".card__slot");
    if (slot) {
      slot.textContent = FOODS[foodId].emoji;
    }

    matchesInRound += 1;
    matchCountEl.textContent = matchesInRound.toString();
    setFeedback("Yes! That snack is a good match.", "success");

    clearFoodSelection();
    fireConfetti();

    if (matchesInRound === ROUNDS[currentRoundIndex].length) {
      setTimeout(() => {
        setFeedback("All farm animals are happy and full!", "success");
      }, 600);
    }
  } else {
    // Gentle incorrect feedback
    animalButton.classList.add("card--match-incorrect");
    setFeedback("Hmm, try a different farm snack.", "error");

    // Soft shake animation via CSS class
    animalButton.classList.add("shake-soft");
    setTimeout(() => {
      animalButton.classList.remove("shake-soft");
      animalButton.classList.remove("card--match-incorrect");
      setFeedback("Pick a snack and match it to a farm animal.", "soft");
    }, 700);
  }
}

function clearAnimalMatchStyles(animalButton) {
  animalButton.classList.remove("card--match-correct", "card--match-incorrect");
}

// SECTION: Drag and Drop
function initDragAndDrop() {
  if (typeof Sortable === "undefined") return;

  // Draggable foods
  // eslint-disable-next-line no-new
  new Sortable(foodGrid, {
    group: {
      name: "foods",
      pull: "clone",
      put: false,
    },
    sort: false,
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
  });

  // Each animal is its own drop zone
  const animalButtons = animalGrid.querySelectorAll(".card--animal");
  animalButtons.forEach((animalBtn) => {
    // eslint-disable-next-line no-new
    new Sortable(animalBtn, {
      group: {
        name: "foods",
        pull: false,
        put: (to, from, dragged) =>
          // Only allow if this food hasn't already been used here
          !dragged.classList.contains("card--disabled"),
      },
      animation: 150,
      onAdd: (evt) => {
        const dragged = evt.item;
        const foodId = dragged.dataset.foodId;
        handleMatchAttempt(foodId, animalBtn);

        // Remove dragged clone from animal button; we only use slot visual
        const parent = dragged.parentNode;
        if (parent) {
          parent.removeChild(dragged);
        }
      },
    });
  });
}

// SECTION: Controls
nextRoundButton.addEventListener("click", () => {
  if (currentRoundIndex < ROUNDS.length - 1) {
    currentRoundIndex += 1;
    renderRound();
  }
});

resetButton.addEventListener("click", () => {
  currentRoundIndex = 0;
  renderRound();
});

// SECTION: Startup
window.addEventListener("DOMContentLoaded", () => {
  renderRound();
});
