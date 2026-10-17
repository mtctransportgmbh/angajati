// Configurație Firebase pentru angajati-mtc — completezi O SINGURĂ DATĂ,
// cu valorile reale din Firebase Console → Project settings → Your apps.
// index.html și potrivire-angajati.html citesc automat de aici.
// Fișierele acelea se pot înlocui oricând fără să mai atingi configul.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCzo4hb0gGhiCdTxFMXwe0Ln2hp4qEaUIE",
  authDomain: "angajati-f1b01.firebaseapp.com",
  projectId: "angajati-f1b01",
  storageBucket: "angajati-f1b01.firebasestorage.app",
  messagingSenderId: "753268962487",
  appId: "1:753268962487:web:37fa40d89a5a986aac4932"
};

// Adresa unde stă portal.html pe GitHub Pages.
window.PORTAL_URL_BASE = "https://mtctransportgmbh.github.io/angajati/portal.html";

// Cheia pentru notificări push (Firebase Console → Project settings → Cloud Messaging →
// Web Push certificates → „Generate key pair”). Lipește aici cheia publică (începe cu „B…”).
// Până o completezi, clopoțelul din aplicație funcționează, dar fără notificări pe telefon în fundal.
window.PUSH_VAPID_KEY = "BGvwV9eBNd9XWKZ3Xw-nTsV0i5BFisTH2Cm90hV2BIGA5TIAAW54_0RLg4wQn7pSXlZws-9FoEzpIHzi3IwDcb4";
