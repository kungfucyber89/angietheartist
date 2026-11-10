const gallery = [
  { src: 'images/weird-family/weird-family-no01-weird-dude.png', title: 'Weird Dude' },
  { src: 'images/weird-family/weird-family-no02-weird-lady.png', title: 'Weird Lady' },
  { src: 'images/weird-family/weird-family-no3-weird-baby.png', title: 'Weird Baby' },
  { src: 'images/weird-family/weird-family-no04-watermelon.png', title: 'Watermelon' },
  { src: 'images/weird-family/weird-family-no05 -weird-statue.png', title: 'Weird Statue' },
  { src: 'images/weird-family/weird-family-no-weird-statue-different-view.png', title: 'Statue (Different View)' },
  { src: 'images/drawings/angie-drawing-no1.jpeg', title: 'Drawing No. 1' },
  { src: 'images/drawings/angie-drawing-no2.jpeg', title: 'Drawing No. 2' },
  { src: 'images/drawings/angie-drawing-no3.jpeg', title: 'Drawing No. 3' },
  { src: 'images/drawings/angie-drawing-no4.jpeg', title: 'Drawing No. 4' },
  { src: 'images/drawings/Drawing No. 5.png', title: 'Drawing No. 5' },
  { src: 'images/drawings/Drawing No. 6.png', title: 'Drawing No. 6' },
  { src: 'images/drawings/Drawing No. 7.png', title: 'Drawing No. 7' },
  { src: 'images/drawings/Drawing No. 8.png', title: 'Drawing No. 8' },
  { src: 'images/drawings/Drawing No. 9.png', title: 'Drawing No. 9' },
  { src: 'images/drawings/Drawing No. 10.png', title: 'Drawing No. 10' },
  { src: 'images/drawings/Drawing No. 11.png', title: 'Drawing No. 11' },
  { src: 'images/drawings/Drawing No. 12.png', title: 'Drawing No. 12' },
  { src: 'images/drawings/Drawing No. 13.png', title: 'Drawing No. 13' },
  { src: 'images/drawings/Drawing No. 14.png', title: 'Drawing No. 14' },
  { src: 'images/drawings/Drawing No. 15.png', title: 'Drawing No. 15' },
  { src: 'images/drawings/Drawing No. 16.png', title: 'Drawing No. 16' },
  { src: 'images/drawings/Drawing No. 17.png', title: 'Drawing No. 17' },
  { src: 'images/drawings/Drawing No. 18.png', title: 'Drawing No. 18' },
  { src: 'images/drawings/Drawing No. 19.png', title: 'Drawing No. 19' },
  { src: 'images/drawings/Drawing No. 20.png', title: 'Drawing No. 20' },
  { src: 'images/drawings/drawing-no21.jpg', title: 'Drawing No. 21' },
  { src: 'images/drawings/drawing-no22.jpg', title: 'Drawing No. 22' },
  { src: 'images/drawings/drawing-no23.png', title: 'Drawing No. 23' },
  { src: 'images/drawings/drawing-no24.png', title: 'Drawing No. 24' },
  { src: 'images/drawings/drawing-no25.jpg', title: 'Drawing No. 25' },
  { src: 'images/drawings/drawing-no26.jpg', title: 'Drawing No. 26' },
  { src: 'images/drawings/drawing-no27.jpg', title: 'Drawing No. 27' },
  { src: 'images/drawings/drawing-no28.jpg', title: 'Drawing No. 28' },
  { src: 'images/drawings/drawing-no29.jpg', title: 'Drawing No. 29' }
];

let currentIndex = 0;

function openModal(index) {
  currentIndex = index;
  updateModalContent();
  document.getElementById('imageModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('imageModal').classList.add('hidden');
}

function nextImage(event) {
  if (event) event.stopPropagation();
  currentIndex = (currentIndex + 1) % gallery.length;
  updateModalContent();
}

function prevImage(event) {
  if (event) event.stopPropagation();
  currentIndex = (currentIndex - 1 + gallery.length) % gallery.length;
  updateModalContent();
}

function updateModalContent() {
  const item = gallery[currentIndex];
  document.getElementById('modalImg').src = item.src;
  document.getElementById('modalCaption').textContent = item.title;
}

// Keyboard support: Left/Right arrows and Escape key
document.addEventListener('keydown', function (e) {
  const modal = document.getElementById('imageModal');
  if (!modal.classList.contains('hidden')) {
    if (e.key === 'ArrowRight') nextImage();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'Escape') closeModal();
  }
});

// Close modal when clicking on the dark background overlay
document.getElementById('imageModal').addEventListener('click', closeModal);
