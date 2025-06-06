document.addEventListener('DOMContentLoaded', () => {
  const slideContainer = document.querySelector('.slides');
  let slides = document.querySelectorAll('.slide');
  const controllers = document.querySelectorAll('.dot');

  let currentSlide = 1;
  let isTransitioning = false;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let interval;

  // Clone first and last slides
  const firstClone = slides[0].cloneNode(true);
  const lastClone = slides[slides.length - 1].cloneNode(true);
  slideContainer.appendChild(firstClone);
  slideContainer.prepend(lastClone);
  slides = document.querySelectorAll('.slide');

  let slideWidth = window.innerWidth;
  slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

  // Resize handler
  window.addEventListener("resize", () => {
    slideWidth = window.innerWidth;
    slideContainer.style.transition = "none";
    slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
  });

  // Correct clones if needed
  function correctClonesIfNeeded() {
    slideContainer.style.transition = 'none';
    if (slides[currentSlide].isSameNode(firstClone)) {
      currentSlide = 1;
      slideContainer.style.transform = `translateX(-${slideWidth}px)`;
    } else if (slides[currentSlide].isSameNode(lastClone)) {
      currentSlide = slides.length - 2;
      slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
    }
    isTransitioning = false;
    updateController();
  }

  slideContainer.addEventListener('transitionend', correctClonesIfNeeded);

  // Go to a specific slide
  function goToSlide(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    slideContainer.style.transition = 'transform 0.5s ease';
    slideContainer.style.transform = `translateX(-${index * slideWidth}px)`;
    currentSlide = index;

    updateController();

    setTimeout(() => {
      if (isTransitioning) correctClonesIfNeeded();
    }, 600);
  }

  // Auto Slide
  function startAutoSlide() {
    clearInterval(interval);
    interval = setInterval(() => {
      if (!isDragging) goToSlide(currentSlide + 1);
    }, 3000);
  }

  function stopAutoSlide() {
    clearInterval(interval);
  }

  startAutoSlide();

  // Drag Handlers
  function startDrag(x) {
    isDragging = true;
    startX = x;
    currentX = x;
    slideContainer.style.transition = 'none';
    stopAutoSlide();
  }

  function duringDrag(x) {
    currentX = x;
    const move = currentX - startX;
    const clampedMove = Math.max(-slideWidth, Math.min(move, slideWidth));
    const translateX = -currentSlide * slideWidth + clampedMove;
    slideContainer.style.transform = `translateX(${translateX}px)`;
  }

  function endDrag() {
    const moveX = currentX - startX;
    if (Math.abs(moveX) > slideWidth / 4) {
      if (moveX < 0) goToSlide(currentSlide + 1);
      else goToSlide(currentSlide - 1);
    } else {
      goToSlide(currentSlide);
    }
    isDragging = false;
    startAutoSlide();
  }

  // Mouse Events
  slideContainer.addEventListener('mousedown', (e) => startDrag(e.clientX));
  slideContainer.addEventListener('mousemove', (e) => { if (isDragging) duringDrag(e.clientX); });
  slideContainer.addEventListener('mouseup', endDrag);
  slideContainer.addEventListener('mouseleave', () => { if (isDragging) endDrag(); });

  // Touch Events
  slideContainer.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
  slideContainer.addEventListener('touchmove', (e) => { if (isDragging) duringDrag(e.touches[0].clientX); });
  slideContainer.addEventListener('touchend', endDrag);

  // Wheel Event
  slideContainer.addEventListener("wheel", (e) => {
    if (isTransitioning || isDragging) return;
    stopAutoSlide();
    if (e.deltaX > 30) goToSlide(currentSlide + 1);
    else if (e.deltaX < -30) goToSlide(currentSlide - 1);
    startAutoSlide();
  });

  // Dot click controllers
  controllers.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      goToSlide(idx + 1); // +1 because of prepended lastClone
    });
  });

  // Update active dot
function updateController() {
  controllers.forEach((btn, idx) => {
    if (currentSlide - 1 === idx) {
      btn.classList.add("bg-pasuseva-orange");
      btn.classList.remove("bg-white", "opacity-50");
    } else {
      btn.classList.remove("bg-pasuseva-orange");
      btn.classList.add("bg-white", "opacity-50");
    }
  });
}


  updateController();
});








  // Store positions of all sliders
  const sliderPositions = {};

  // Set common item width (w-48 + mx-4)
  const itemWidth = 224;

  // Event delegation
  document.querySelectorAll('[data-slider]').forEach(button => {
    button.addEventListener('click', () => {
      const sliderName = button.getAttribute('data-slider');
      const direction = button.getAttribute('data-dir');
      const slider = document.getElementById(`${sliderName}-slider`);
      const container = slider.parentElement;

      // Initialize if not already
      if (!sliderPositions[sliderName]) {
        sliderPositions[sliderName] = 0;
      }

      const maxScroll = slider.scrollWidth - container.offsetWidth;

      if (direction === 'prev') {
        sliderPositions[sliderName] -= itemWidth;
        if (sliderPositions[sliderName] < 0) {
          sliderPositions[sliderName] = 0;
        }
      } else {
        sliderPositions[sliderName] += itemWidth;
        if (sliderPositions[sliderName] > maxScroll) {
          sliderPositions[sliderName] = maxScroll;
        }
      }

      slider.style.transform = `translateX(-${sliderPositions[sliderName]}px)`;
    });
  });



   const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  // Toggle menu
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent outside click from immediately closing
    mobileMenu.classList.toggle('hidden');
  });

  // Click outside to close
  document.addEventListener('click', function (event) {
    const isClickInside = mobileMenu.contains(event.target);
    const isClickOnToggle = menuToggle.contains(event.target);

    if (!isClickInside && !isClickOnToggle) {
      mobileMenu.classList.add('hidden');
    }
  });