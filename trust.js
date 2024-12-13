  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Function to set cookie with 24h expiration
  function setCookie(name, value) {
    const date = new Date();
    date.setTime(date.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value};${expires};path=/`;
  }

  // Function to update the DOM elements
  function updateDOMElements(rating) {
    const fullScoreElements = document.querySelectorAll('[hs-trust-score-full]');
    if (fullScoreElements.length > 0) {
      fullScoreElements.forEach(element => {
        element.textContent = `${rating} von 5 Sternen bei Trusted Shop (Note: "Sehr gut")`;
      });
    }
  }

  // Check if cookie exists
  const cookieValue = getCookie('workstatt-trustpilot');
  
  if (cookieValue) {
    // Use value from cookie
    updateDOMElements(cookieValue);
  } else {
    // Make the request if no cookie exists
    fetch('https://widgets.trustedshops.com/js/XFD05DF0198F2E8E8D5DA98A2F881D013.js')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(data => {
        const ratingMatch = data.match(/averageRating:\s*(\d+(?:\.\d+)?)/);
        
        if (ratingMatch && ratingMatch[1]) {
          const averageRating = parseFloat(ratingMatch[1]);
          // Save to cookie
          setCookie('workstatt-trustpilot', averageRating);
          // Update DOM
          updateDOMElements(averageRating);
        }
      })
      .catch(error => {
        console.error('Error fetching TrustedShops data:', error);
      });
  }
