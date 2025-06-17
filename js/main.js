// document.addEventListener('DOMContentLoaded', () => {
//   const slideContainer = document.querySelector('.slides');
//   let slides = document.querySelectorAll('.slide');
//   const controllers = document.querySelectorAll('.dot');

//   let currentSlide = 1;
//   let isTransitioning = false;
//   let startX = 0;
//   let currentX = 0;
//   let isDragging = false;
//   let interval;

//   // Clone first and last slides
//   const firstClone = slides[0].cloneNode(true);
//   const lastClone = slides[slides.length - 1].cloneNode(true);
//   slideContainer.appendChild(firstClone);
//   slideContainer.prepend(lastClone);
//   slides = document.querySelectorAll('.slide');

//   let slideWidth = window.innerWidth; 
//   slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

//   // Resize handler
//   window.addEventListener("resize", () => {
//     slideWidth = window.innerWidth;
//     slideContainer.style.transition = "none";
//     slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
//   });

//   // Correct clones if needed
//   function correctClonesIfNeeded() {
//     slideContainer.style.transition = 'none';
//     if (slides[currentSlide].isSameNode(firstClone)) {
//       currentSlide = 1;
//       slideContainer.style.transform = `translateX(-${slideWidth}px)`;
//     } else if (slides[currentSlide].isSameNode(lastClone)) {
//       currentSlide = slides.length - 2;
//       slideContainer.style.transform = `translateX(-${currentSlide * slideWidth}px)`;
//     }
//     isTransitioning = false;
//     updateController();
//   }

//   slideContainer.addEventListener('transitionend', correctClonesIfNeeded);

//   // Go to a specific slide
//   function goToSlide(index) {
//     if (isTransitioning) return;
//     isTransitioning = true;
//     slideContainer.style.transition = 'transform 0.5s ease';
//     slideContainer.style.transform = `translateX(-${index * slideWidth}px)`;
//     currentSlide = index;

//     updateController();

//     setTimeout(() => {
//       if (isTransitioning) correctClonesIfNeeded();
//     }, 600);
//   }

//   // Auto Slide
//   function startAutoSlide() {
//     clearInterval(interval);
//     interval = setInterval(() => {
//       if (!isDragging) goToSlide(currentSlide + 1);
//     }, 3000);
//   }

//   function stopAutoSlide() {
//     clearInterval(interval);
//   }

//   startAutoSlide();

//   // Drag Handlers
//   function startDrag(x) {
//     isDragging = true;
//     startX = x;
//     currentX = x;
//     slideContainer.style.transition = 'none';
//     stopAutoSlide();
//   }

//   function duringDrag(x) {
//     currentX = x;
//     const move = currentX - startX;
//     const clampedMove = Math.max(-slideWidth, Math.min(move, slideWidth));
//     const translateX = -currentSlide * slideWidth + clampedMove;
//     slideContainer.style.transform = `translateX(${translateX}px)`;
//   }

//   function endDrag() {
//     const moveX = currentX - startX;
//     if (Math.abs(moveX) > slideWidth / 4) {
//       if (moveX < 0) goToSlide(currentSlide + 1);
//       else goToSlide(currentSlide - 1);
//     } else {
//       goToSlide(currentSlide);
//     }
//     isDragging = false;
//     startAutoSlide();
//   }

//   // Mouse Events
//   slideContainer.addEventListener('mousedown', (e) => startDrag(e.clientX));
//   slideContainer.addEventListener('mousemove', (e) => { if (isDragging) duringDrag(e.clientX); });
//   slideContainer.addEventListener('mouseup', endDrag);
//   slideContainer.addEventListener('mouseleave', () => { if (isDragging) endDrag(); });

//   // Touch Events
//   slideContainer.addEventListener('touchstart', (e) => startDrag(e.touches[0].clientX));
//   slideContainer.addEventListener('touchmove', (e) => { if (isDragging) duringDrag(e.touches[0].clientX); });
//   slideContainer.addEventListener('touchend', endDrag);

//   // Wheel Event
//   slideContainer.addEventListener("wheel", (e) => {
//     if (isTransitioning || isDragging) return;
//     stopAutoSlide();
//     if (e.deltaX > 30) goToSlide(currentSlide + 1);
//     else if (e.deltaX < -30) goToSlide(currentSlide - 1);
//     startAutoSlide();
//   });

//   // Dot click controllers
//   controllers.forEach((btn, idx) => {
//     btn.addEventListener('click', () => {
//       goToSlide(idx + 1); // +1 because of prepended lastClone
//     });
//   });

//   // Update active dot
// function updateController() {
//   controllers.forEach((btn, idx) => {
//     if (currentSlide - 1 === idx) {
//       btn.classList.add("bg-pasuseva-orange");
//       btn.classList.remove("bg-white", "opacity-50");
//     } else {
//       btn.classList.remove("bg-pasuseva-orange");
//       btn.classList.add("bg-white", "opacity-50");
//     }
//   });
// }


//   updateController();
// });



document.addEventListener('DOMContentLoaded', () => {
  const slideContainer = document.querySelector('.slides');
  const originalSlides = document.querySelectorAll('.slide');
  const dots = document.querySelectorAll('.dot');

  let slideWidth = window.innerWidth;
  let currentIndex = 1;
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let autoSlideInterval;

  // Clone first and last
  const firstClone = originalSlides[0].cloneNode(true);
  const lastClone = originalSlides[originalSlides.length - 1].cloneNode(true);
  slideContainer.appendChild(firstClone);
  slideContainer.insertBefore(lastClone, slideContainer.firstChild);

  let allSlides = document.querySelectorAll('.slide');

  function updateWidth() {
    slideWidth = window.innerWidth;
    allSlides.forEach(slide => slide.style.width = `${slideWidth}px`);
    slideContainer.style.width = `${allSlides.length * slideWidth}px`;
    slideContainer.style.transition = 'none';
    slideContainer.style.transform = `translateX(-${slideWidth * currentIndex}px)`;
  }

  function updateDots() {
    const realIndex = (currentIndex - 1 + originalSlides.length) % originalSlides.length;
    dots.forEach((dot, i) => {
      dot.classList.toggle('bg-pasuseva-orange', i === realIndex);
      dot.classList.toggle('bg-white', i !== realIndex);
      dot.classList.toggle('opacity-50', i !== realIndex);
    });
  }

  function moveToSlide(index) {
    currentIndex = index;
    slideContainer.style.transition = 'transform 0.5s ease-in-out';
    slideContainer.style.transform = `translateX(-${slideWidth * currentIndex}px)`;
    updateDots();
  }

  slideContainer.addEventListener('transitionend', () => {
    if (currentIndex === 0) {
      slideContainer.style.transition = 'none';
      currentIndex = originalSlides.length;
      slideContainer.style.transform = `translateX(-${slideWidth * currentIndex}px)`;
    } else if (currentIndex === allSlides.length - 1) {
      slideContainer.style.transition = 'none';
      currentIndex = 1;
      slideContainer.style.transform = `translateX(-${slideWidth * currentIndex}px)`;
    }
    updateDots();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      moveToSlide(i + 1);
    });
  });

  function startAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
      moveToSlide(currentIndex + 1);
    }, 3000);
  }

  // Drag & Touch Support
  function dragStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    slideContainer.style.transition = 'none';
    clearInterval(autoSlideInterval);
  }

  function dragMove(e) {
    if (!isDragging) return;
    currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const moveX = currentX - startX;
    slideContainer.style.transform = `translateX(${ -currentIndex * slideWidth + moveX }px)`;
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    const moved = currentX - startX;
    if (Math.abs(moved) > slideWidth / 4) {
      if (moved < 0) moveToSlide(currentIndex + 1);
      else moveToSlide(currentIndex - 1);
    } else {
      moveToSlide(currentIndex);
    }
    startAutoSlide();
  }

  window.addEventListener('resize', updateWidth);
  slideContainer.addEventListener('mousedown', dragStart);
  slideContainer.addEventListener('mousemove', dragMove);
  slideContainer.addEventListener('mouseup', dragEnd);
  slideContainer.addEventListener('mouseleave', dragEnd);

  slideContainer.addEventListener('touchstart', dragStart);
  slideContainer.addEventListener('touchmove', dragMove);
  slideContainer.addEventListener('touchend', dragEnd);

  updateWidth();
  moveToSlide(currentIndex);
  startAutoSlide();
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