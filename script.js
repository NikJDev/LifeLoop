// 1. Elemente aus dem HTML-Dokument suchen und in Variablen speichern
const openBtn = document.getElementById('open-login');
const loginOverlay = document.getElementById('login-overlay');
const startContent = document.getElementById('start-content');

// 2. Dem Button sagen, dass er auf einen Klick warten soll
openBtn.addEventListener('click', (e) => {
  
  // Verhindert, dass der Link "#" die Seite nach oben springen lässt
  e.preventDefault(); 
  
  // 3. Startseite ausfaden lassen (CSS-Klasse hinzufügen)
  startContent.classList.add('fade-out');
  
  // 4. Warten, bis das Ausfaden fertig ist (500ms), dann Fenster wechseln
  setTimeout(() => {
    startContent.style.display = 'none';  // Startseite unsichtbar machen
    loginOverlay.classList.add('active'); // Anmelde-Fenster reinrutschen lassen
  }, 500); 
  
});