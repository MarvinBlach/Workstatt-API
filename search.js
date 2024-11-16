document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('[hs-api-input]');
  const resultsContainer = document.querySelector('[hs-response]');
  const webflowForm = document.querySelector('[search-form]');
  const hideElements = document.querySelectorAll('[search-hide]');
  
  // Clear any placeholder content
  resultsContainer.innerHTML = '';
  
  // Prevent Webflow form from submitting
  webflowForm.addEventListener('submit', (e) => {
      e.preventDefault();
      hideElements.forEach(element => {
          element.style.display = 'none';
      });
      return false;
  });
  
  // Listen for input changes and Enter key
  searchInput.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
          e.preventDefault(); // Prevent any default enter behavior
          hideElements.forEach(element => {
              element.style.display = 'none';
          });
          const query = searchInput.value.trim();
          if (query) {
              try {
                  const response = await fetch(`https://assistant.workstatt.cloud/search?query=${encodeURIComponent(query)}`);
                  const data = await response.json();
                  updateSearchResults(data);
              } catch (error) {
                  console.error('Error fetching search results:', error);
              }
          }
      }
  });
  
  // Function to update search results in the DOM
  function updateSearchResults(results) {
      if (!results || !results.length) {
          resultsContainer.innerHTML = '<div class="search_produkte-holder">No results found</div>';
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