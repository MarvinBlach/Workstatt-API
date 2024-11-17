document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('[hs-api-input]');
  const resultsContainer = document.querySelector('[hs-response]');
  const webflowForm = document.querySelector('[search-form]');
  const hideElements = document.querySelectorAll('[search-hide]');
  const submitButton = document.querySelector('[api-submit]');

  // Clear any placeholder content
  resultsContainer.innerHTML = '';

  // Function to handle the search
  async function performSearch(query) {
      if (query) {
          hideElements.forEach(element => {
              element.style.display = 'none';
          });
          try {
              const response = await fetch(`https://assistant.workstatt.cloud/search?query=${encodeURIComponent(query)}`);
              const data = await response.json();
              updateSearchResults(data);
          } catch (error) {
              console.error('Error fetching search results:', error);
          }
      }
  }

  // Handle input changes for submit button visibility
  searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query) {
          submitButton.classList.add('is-active');
      } else {
          submitButton.classList.remove('is-active');
      }
  });

  // Prevent Webflow form from submitting
  webflowForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      performSearch(query);
      return false;
  });

  // Handle submit button click
  submitButton.addEventListener('click', (e) => {
      e.preventDefault();
      const query = searchInput.value.trim();
      performSearch(query);
  });

  // Listen for Enter key
  searchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchInput.value.trim();
          performSearch(query);
      }
  });

  // Function to update search results in the DOM
  function updateSearchResults(results) {
      if (!results || !results.length) {
          resultsContainer.innerHTML = '<div class="search_produkte-holder">Keine Ergebnisse gefunden.</div>';
          return;
      }

      const productsHTML = results.map(product => `
          <div class="search_produkte-item">
              <a hs-api-link href="/products/${product.metadata.handle}" class="search_produkte-link w-inline-block">
                  <img src="${product.metadata.image}"
                      loading="lazy"
                      hs-api-image
                      alt="${product.metadata.title}"
                      class="search_produkte-img">
                  <div class="search_produkte-inner">
                      <div hs-api-title>${product.metadata.title}</div>
                      <div hs-api-price>€${product.metadata.price_min.toFixed(2)}</div>
                  </div>
              </a>
          </div>
      `).join('');

      resultsContainer.innerHTML = `
          <div class="search_produkte-holder">
              ${productsHTML}
          </div>
      `;
  }
});