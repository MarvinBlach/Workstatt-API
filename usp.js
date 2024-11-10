document.addEventListener("DOMContentLoaded", function() {
    const swiperElement = document.querySelector('.is-subbanner');
    if (!swiperElement) return;
    
    // Log total slides before initialization
    console.log('Total slides:', swiperElement.querySelectorAll('.swiper-slide').length);
    
    const swiper = new Swiper(".is-subbanner", {
        slidesPerView: 'auto',
        spaceBetween: 20,
        effect: 'slide',
        speed: 800,
        a11y: false,
        loop: true,
        pagination: {
            el: ".swiper-pagination-subbaner",
            clickable: true,
            bulletClass: 'subbanner-bullet',
            bulletActiveClass: 'subbanner-bullet-active',
            renderBullet: function(index, className) {
                console.log('Rendering bullet for index:', index);
                return '<span class="' + className + ' subbanner-bullet"></span>';
            }
        },
        on: {
            init: function() {
                console.log('Swiper initialized');
                console.log('Real number of slides:', this.slides.length);
                console.log('Number of pagination bullets:', document.querySelectorAll('.subbanner-bullet').length);
            },
            slideChange: function() {
                console.log('Slide changed to:', this.realIndex);
            }
        },
        breakpoints: {
            1024: {
                slidesPerView: 'auto',
                spaceBetween: 0,
                noSwiping: true,
                allowTouchMove: false,
                autoplay: false,
            },
            768: {
                slidesPerView: 3,
                spaceBetween: 20,
            },
            0: {
                slidesPerView: 'auto',
                spaceBetween: 20,
            }
        }
    });
});