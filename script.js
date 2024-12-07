function updateReviews(data) {
  const { reviews, average_rating } = data;
  const totalReviews = reviews.length;
  const reviewsWithRating = reviews.filter(review => review.rating > 0);
  const recommendationPercentage = reviewsWithRating.length > 0
    ? Math.round((reviewsWithRating.filter(review => review.rating === 5).length / reviewsWithRating.length) * 100)
    : 0;

  // Update all instances of review summaries
  const reviewHolders = document.querySelectorAll('.reviews_holder');
  reviewHolders.forEach(holder => {
    // Update star rating in the summary
    const summaryStarHolder = holder.querySelector('.star_holder');
    if (summaryStarHolder) {
      summaryStarHolder.innerHTML = generateStars(average_rating);
    }

    // Update average rating and total reviews
    const averageRatingElement = holder.querySelector('.text-size-large');
    if (averageRatingElement) {
      averageRatingElement.innerHTML = `${average_rating.toFixed(1)} (<span hs-total-reviews="">${totalReviews}</span> Bewertungen)`;
    }
  });

  // Update all instances of total reviews
  document.querySelectorAll('[hs-total-reviews]').forEach(element => {
    element.textContent = totalReviews;
  });

  // Update all instances of recommendation percentage
  document.querySelectorAll('[hs-weiterempfehlung]').forEach(element => {
    element.textContent = recommendationPercentage;
  });

  // Generate reviews HTML (this part remains the same)
  const reviewsHTML = reviews.map(review => `
    <div class="review_list-item">
      ${review.rating > 0 ? `
        <div class="star_holder-top">
          <div class="star_holder">
            ${generateStars(review.rating)}
          </div>
        </div>
      ` : ''}
      <div class="review_list-comment">
        <div hs-review-heading="" class="heading-style-h3">${review.title}</div>
        <p hs-review-text="" class="text-size-regular">${review.content || 'Keine Bewertung verfügbar.'}</p>
        <div class="comment_wrapper">
          <div hs-initials="" class="comment_element">${getInitials(review.name)}</div>
          <div>
            <div class="commenter_name">
              <div hs-name="" class="text-size-regular">${review.name}</div>
              ${review.verified_customer ? `
                <div class="icon-embed-16 w-embed"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 15 16" fill="none" preserveAspectRatio="xMidYMid meet" aria-hidden="true" role="img">
                  <mask id="mask0_7462_90914" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="15" height="16">
                    <rect y="0.292969" width="15" height="15" fill="#D9D9D9"></rect>
                  </mask>
                  <g mask="url(#mask0_7462_90914)">
                    <path d="M5.375 14.3555L4.1875 12.3555L1.9375 11.8555L2.15625 9.54297L0.625 7.79297L2.15625 6.04297L1.9375 3.73047L4.1875 3.23047L5.375 1.23047L7.5 2.13672L9.625 1.23047L10.8125 3.23047L13.0625 3.73047L12.8438 6.04297L14.375 7.79297L12.8438 9.54297L13.0625 11.8555L10.8125 12.3555L9.625 14.3555L7.5 13.4492L5.375 14.3555ZM6.84375 10.0117L10.375 6.48047L9.5 5.57422L6.84375 8.23047L5.5 6.91797L4.625 7.79297L6.84375 10.0117Z" fill="#FF6A6A"></path>
                  </g>
                </svg></div>
              ` : ''}
            </div>
            <div hs-date="" class="text-size-regular op_50">${formatDate(review.date)}</div>
          </div>
        </div>
      </div>
      ${review.reply ? `
        <div class="answer_holder">
          <p class="text-size-regular">"${review.reply}"</p>
          <div class="comment_wrapper">
            <div class="workstatt_element"></div>
            <div>
              <div class="commenter_name">
                <div class="text-size-regular">Workstatt Team</div>
              </div>
              <div class="text-size-regular op_50">${formatDate(new Date())}</div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Update all review lists and show the reviews holder
  document.querySelectorAll('.review_list').forEach(reviewList => {
    reviewList.innerHTML = reviewsHTML;
    // Find the parent reviews_holder and add is-loaded class
    const reviewsHolder = reviewList.closest('.reviews_holder');
    if (reviewsHolder) {
      reviewsHolder.classList.add('is-loaded');
    }
  });
}

// The rest of the functions remain the same
function generateStars(rating) {
  return Array(5).fill().map((_, i) => `
    <div class="${i < rating ? 'star-filled' : 'star-empty'}"></div>
  `).join('');
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('.') + '.';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
}
