// =====================================
// GAMEVERSE - MAIN JAVASCRIPT
// =====================================

let currentPage = 1;
let currentSearch = "";
let currentGenre = "";
let currentPlatform = "";
let isLoading = false;

const gameGrid = document.getElementById("gameGrid");
const favoriteGrid = document.getElementById("favoriteGrid");
const searchInput = document.getElementById("searchInput");

let favorites = JSON.parse(localStorage.getItem("gameverse_favorites") || "[]");

// Loader
window.addEventListener("load", () => {
    setTimeout(() => {
        const loader = document.getElementById("loader");
        if (loader) loader.style.display = "none";
    }, 1000);

    loadGames();
});

// =====================================
// RAWG API
// =====================================

async function fetchGames(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("API request failed");
        }

        return await response.json();

    } catch (error) {
        console.error(error);
        showToast("Unable to load games. Check your API key and internet.");
        return null;
    }
}

function buildURL() {
    const key = window.GAMEVERSE_CONFIG?.RAWG_API_KEY;

    if (!key || key === "PASTE_YOUR_RAWG_API_KEY_HERE") {
        showToast("Please add your RAWG API key in config.js");
        return null;
    }

    let url = new URL("https://api.rawg.io/api/games");

    url.searchParams.set("key", key);
    url.searchParams.set("page", currentPage);
    url.searchParams.set("page_size", "20");
    url.searchParams.set("ordering", "-rating");

    if (currentSearch) {
        url.searchParams.set("search", currentSearch);
    }

    if (currentGenre) {
        url.searchParams.set("genres", currentGenre);
    }

    if (currentPlatform) {
        url.searchParams.set("platforms", currentPlatform);
    }

    return url.toString();
}

// =====================================
// LOAD GAMES
// =====================================

async function loadGames(append = false) {
    if (isLoading) return;

    const url = buildURL();

    if (!url) return;

    isLoading = true;

    if (!append) {
        gameGrid.innerHTML = '<p class="loading-text">Loading games...</p>';
    }

    const data = await fetchGames(url);

    if (!data) {
        gameGrid.innerHTML = '<p class="empty">Unable to load games.</p>';
        isLoading = false;
        return;
    }

    if (!data.results || data.results.length === 0) {
        gameGrid.innerHTML = '<p class="empty">No games found.</p>';
        isLoading = false;
        return;
    }

    if (!append) {
        gameGrid.innerHTML = "";
    }

    data.results.forEach(game => {
        gameGrid.insertAdjacentHTML("beforeend", createGameCard(game));
    });

    isLoading = false;
}

function createGameCard(game) {
    const image = game.background_image ||
        "https://placehold.co/600x400/120d20/ffffff?text=GAMEVERSE";

    const rating = game.rating || "N/A";

    const saved = favorites.some(item => item.id === game.id);

    return `
    <article class="game-card">

        <img
            src="${escapeHTML(image)}"
            alt="${escapeHTML(game.name)}"
            loading="lazy"
        >

        <div class="game-info">

            <h3>${escapeHTML(game.name)}</h3>

            <p>
                Released: ${escapeHTML(game.released || "Unknown")}
            </p>

            <div class="game-rating">
                ⭐ ${rating}/5
            </div>

            <div class="game-actions">

                <button onclick="showDetails(${game.id})">
                    DETAILS
                </button>

                <button onclick="toggleFavorite(${game.id})">
                    ${saved ? "♥ SAVED" : "♡ SAVE"}
                </button>

            </div>

        </div>
    </article>
    `;
}

// =====================================
// SEARCH
// =====================================

function searchGames() {
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    loadGames();
}

searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
        searchGames();
    }
});

// =====================================
// FILTERS
// =====================================

function filterGames() {
    currentGenre = document.getElementById("genreFilter").value;
    currentPlatform = document.getElementById("platformFilter").value;

    currentPage = 1;

    loadGames();
}

// =====================================
// LOAD MORE
// =====================================

function loadMore() {
    if (isLoading) return;

    currentPage++;
    loadGames(true);
}

// =====================================
// GAME DETAILS
// =====================================

async function showDetails(id) {
    const key = window.GAMEVERSE_CONFIG?.RAWG_API_KEY;

    if (!key || key === "PASTE_YOUR_RAWG_API_KEY_HERE") {
        showToast("Add your RAWG API key first.");
        return;
    }

    const url =
        `https://api.rawg.io/api/games/${id}?key=${encodeURIComponent(key)}`;

    const data = await fetchGames(url);

    if (!data) return;

    const modal = document.getElementById("gameModal");
    const details = document.getElementById("modalDetails");

    details.innerHTML = `
        <img
            src="${escapeHTML(data.background_image || "")}"
            alt="${escapeHTML(data.name)}"
        >

        <h2>${escapeHTML(data.name)}</h2>

        <p>⭐ Rating: ${data.rating || "N/A"}/5</p>

        <p>Released: ${escapeHTML(data.released || "Unknown")}</p>

        <p>Metacritic: ${data.metacritic || "N/A"}</p>

        <p>Genres: ${
            (data.genres || []).map(g => escapeHTML(g.name)).join(", ")
        }</p>

        <p>Platforms: ${
            (data.platforms || [])
            .map(p => escapeHTML(p.platform.name))
            .join(", ")
        }</p>

        <div class="description">
            ${data.description || "No description available."}
        </div>

        <button class="btn primary"
            onclick="toggleFavorite(${data.id})">
            ♡ ADD TO FAVORITES
        </button>

        <p class="api-credit">
            Game information provided by RAWG.
        </p>
    `;

    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById("gameModal").style.display = "none";
}

document.getElementById("gameModal").addEventListener("click", event => {
    if (event.target.id === "gameModal") {
        closeModal();
    }
});

// =====================================
// FAVORITES
// =====================================

async function toggleFavorite(id) {
    const exists = favorites.some(game => game.id === id);

    if (exists) {
        favorites = favorites.filter(game => game.id !== id);
        showToast("Removed from favorites");
    } else {
        const key = window.GAMEVERSE_CONFIG?.RAWG_API_KEY;

        if (!key || key === "PASTE_YOUR_RAWG_API_KEY_HERE") {
            showToast("Add your RAWG API key first.");
            return;
        }

        const data = await fetchGames(
            `https://api.rawg.io/api/games/${id}?key=${encodeURIComponent(key)}`
        );

        if (!data) return;

        favorites.push({
            id: data.id,
            name: data.name,
            background_image: data.background_image,
            rating: data.rating
        });

        showToast("Added to favorites ♥");
    }

    localStorage.setItem(
        "gameverse_favorites",
        JSON.stringify(favorites)
    );

    displayFavorites();
    loadGames();
}

function displayFavorites() {
    if (!favorites.length) {
        favoriteGrid.innerHTML =
            '<p class="empty">Your favorite games will appear here.</p>';
        return;
    }

    favoriteGrid.innerHTML = favorites.map(game => `
        <article class="game-card">

            <img
                src="${escapeHTML(game.background_image || "")}"
                alt="${escapeHTML(game.name)}"
            >

            <div class="game-info">

                <h3>${escapeHTML(game.name)}</h3>

                <div class="game-rating">
                    ⭐ ${game.rating || "N/A"}
                </div>

                <div class="game-actions">
                    <button onclick="showDetails(${game.id})">
                        DETAILS
                    </button>

                    <button onclick="toggleFavorite(${game.id})">
                        REMOVE ♥
                    </button>
                </div>

            </div>
        </article>
    `).join("");
}

displayFavorites();

// =====================================
// ANDROID & PC
// =====================================

function showAndroid() {
    currentSearch = "";
    currentGenre = "";
    currentPlatform = "21";

    document.getElementById("genreFilter").value = "";
    document.getElementById("platformFilter").value = "21";

    currentPage = 1;

    loadGames();

    document.getElementById("explore").scrollIntoView({
        behavior: "smooth"
    });
}

function showPC() {
    currentSearch = "";
    currentGenre = "";
    currentPlatform = "4";

    document.getElementById("genreFilter").value = "";
    document.getElementById("platformFilter").value = "4";

    currentPage = 1;

    loadGames();

    document.getElementById("explore").scrollIntoView({
        behavior: "smooth"
    });
}

// =====================================
// MOBILE MENU
// =====================================

function toggleMenu() {
    document.querySelector("nav").classList.toggle("active");
}

document.querySelectorAll("nav a").forEach(link => {
    link.addEventListener("click", () => {
        document.querySelector("nav").classList.remove("active");
    });
});

// =====================================
// CONTACT
// =====================================

function sendMessage(event) {
    event.preventDefault();

    const name = document.getElementById("contactName").value;
    const email = document.getElementById("contactEmail").value;
    const message = document.getElementById("contactMessage").value;

    const subject = encodeURIComponent("GAMEVERSE Contact");
    const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\n${message}`
    );

    window.location.href =
        `mailto:gameverse@example.com?subject=${subject}&body=${body}`;

    showToast("Opening your email application...");
}

// =====================================
// TOAST MESSAGE
// =====================================

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// =====================================
// SECURITY HELPER
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

console.log("🎮 GAMEVERSE INITIALIZED!");
