// Configurație Firebase pentru angajati-mtc — completezi O SINGURĂ DATĂ,
// cu valorile reale din Firebase Console → Project settings → Your apps.
// index.html și potrivire-angajati.html citesc automat de aici.
// Fișierele acelea se pot înlocui oricând fără să mai atingi configul.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",
  authDomain: "angajati-mtc.firebaseapp.com",
  projectId: "angajati-mtc",
  storageBucket: "angajati-mtc.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

// Adresa unde va sta portal.html odată urcat pe GitHub Pages, ex:
// "https://angajati.mtctransportgmbh.de/portal.html"
// Până atunci, poți lăsa placeholder-ul — codurile QR generate local nu vor
// funcționa la scanare până nu pui adresa reală aici (o singură dată).
window.PORTAL_URL_BASE = "https://angajati.mtctransportgmbh.de/portal.html";
