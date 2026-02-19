// --- IMPORTACIONES DE FIREBASE (Versión Web) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- TU CONFIGURACIÓN (Tus credenciales) ---
const firebaseConfig = {
  apiKey: "AIzaSyCTj8JjONa_BTthE47DmImLv-lbAMMUvhk",
  authDomain: "editorial-ia.firebaseapp.com",
  projectId: "editorial-ia",
  storageBucket: "editorial-ia.firebasestorage.app",
  messagingSenderId: "519851057957",
  appId: "1:519851057957:web:685bbf5d28bf569060b0cc",
  measurementId: "G-Z4D5K9YCBT"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- VARIABLES GLOBALES ---
const API_URL = 'http://localhost:3000/api'; // Conexión con tu Backend (Node.js)
let currentUserData = null; // Aquí guardaremos si es FREE o PRO
let currentChapters = [];

// --- SISTEMA DE LOGIN Y REGISTRO ---

// Hacemos las funciones globales para que el HTML pueda usarlas (window.funcion)
window.login = async function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value; // Usamos el campo código como contraseña
    const btn = document.querySelector('#login-screen button');

    if (!email || !password) return alert("Por favor llena ambos campos");

    btn.innerText = "Verificando...";

    try {
        // Intentamos iniciar sesión
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        // Si falla (ej: usuario no existe), intentamos registrarlo automáticamente
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // Crear perfil en Base de Datos (Por defecto GRATIS)
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    email: email,
                    plan: "FREE",
                    createdAt: new Date()
                });
                alert("Cuenta creada exitosamente. ¡Bienvenido!");
            } catch (regError) {
                alert("Error: " + regError.message);
                btn.innerText = "Entrar / Registrarse";
            }
        } else {
            alert("Error: " + error.message);
            btn.innerText = "Entrar / Registrarse";
        }
    }
};

// Escuchar cambios de sesión (Si el usuario entra correctamente)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario logueado
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        document.getElementById('dashboard-screen').classList.add('active');
        
        // Cargar datos del plan desde Firebase (Firestore)
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            currentUserData = docSnap.data();
            updateUI(currentUserData);
        } else {
            // Si no tiene datos, creamos unos básicos
            currentUserData = { email: user.email, plan: "FREE" };
            updateUI(currentUserData);
        }
    } else {
        // Usuario salió
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard-screen').classList.add('hidden');
    }
});

function updateUI(userData) {
    document.getElementById('user-display').innerText = userData.email.split('@')[0];
    const badge = document.getElementById('plan-badge');
    
    if (userData.plan === 'PRO') {
        badge.innerText = "Plan: PRO 💎";
        badge.style.background = "#ffd700";
        badge.style.color = "black";
        // Habilitar opción épica
        document.querySelector('option[value="epico"]').disabled = false;
    } else {
        badge.innerText = "Plan: GRATIS";
        badge.style.background = "#444";
        badge.style.color = "white";
        document.querySelector('option[value="epico"]').disabled = true;
    }
}

// --- GENERAR ESTRUCTURA (Conecta con Node.js) ---
window.generateOutline = async function() {
    const idea = document.getElementById('idea-input').value;
    if(!idea) return alert("Escribe una idea primero");

    const btn = document.querySelector('#step-1 button');
    btn.innerText = "Pensando...";
    
    try {
        const res = await fetch(`${API_URL}/generate-outline`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ idea })
        });
        const data = await res.json();
        currentChapters = data.chapters;
        renderChapters();
        
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert("Error conectando con la IA. Asegúrate que server.js esté corriendo.");
    } finally {
        btn.innerText = "Generar Estructura"; // Restaurar texto pero con ícono si quieres
    }
};

// --- RENDERIZADO Y LÓGICA DE CAPÍTULOS ---
window.renderChapters = function() {
    const list = document.getElementById('chapters-list');
    list.innerHTML = '';
    
    currentChapters.forEach((chap, index) => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.innerHTML = `
            <div>
                <strong>Cap ${index + 1}: ${chap.title}</strong><br>
                <small>${chap.desc}</small>
            </div>
            <div>
                <button onclick="moveChapter(${index}, -1)">⬆</button>
                <button onclick="moveChapter(${index}, 1)">⬇</button>
                <button onclick="deleteChapter(${index})" style="background:#ff4757">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
};

window.moveChapter = function(index, direction) {
    if (index + direction < 0 || index + direction >= currentChapters.length) return;
    const temp = currentChapters[index];
    currentChapters[index] = currentChapters[index + direction];
    currentChapters[index + direction] = temp;
    renderChapters();
};

window.deleteChapter = function(index) {
    if(confirm("¿Borrar este capítulo?")) {
        currentChapters.splice(index, 1);
        renderChapters();
    }
};

window.addChapter = function() {
    const title = prompt("Título del capítulo:");
    if(title) {
        const desc = prompt("Descripción breve:");
        currentChapters.push({ title, desc: desc || "Sin descripción" });
        renderChapters();
    }
};

window.goToSettings = function() {
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('step-3').classList.remove('hidden');
};

// --- ESCRIBIR EL LIBRO ---
window.startWriting = async function() {
    const settings = {
        length: document.getElementById('opt-length').value,
        pov: document.getElementById('opt-pov').value,
        style: document.getElementById('opt-style').value,
        audience: document.getElementById('opt-audience').value,
        focus: 'General'
    };

    document.getElementById('step-3').classList.add('hidden');
    document.getElementById('step-4').classList.remove('hidden');
    const contentDiv = document.getElementById('book-content');
    contentDiv.innerHTML = "<h3>Generando tu obra maestra...</h3><p>La IA está escribiendo capítulo por capítulo...</p>";

    let fullText = "";

    for (let chap of currentChapters) {
        // Añadir indicador visual de que está escribiendo este capítulo
        const loadingP = document.createElement('p');
        loadingP.innerHTML = `<em>⏳ Escribiendo: ${chap.title}...</em>`;
        contentDiv.appendChild(loadingP);
        
        try {
            const res = await fetch(`${API_URL}/write-chapter`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    chapterInfo: chap, 
                    settings,
                    context: fullText.slice(-500)
                })
            });
            const data = await res.json();
            
            // Eliminar mensaje de carga
            contentDiv.removeChild(loadingP);
            
            // Añadir contenido real
            const chapterHtml = `<h2>${chap.title}</h2><p>${data.content.replace(/\n/g, '<br>')}</p><hr>`;
            fullText += chapterHtml;
            
            // Crear un div temporal para añadirlo sin borrar lo anterior
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapterHtml;
            contentDiv.appendChild(tempDiv);
            
            // Auto-scroll hacia abajo
            window.scrollTo(0, document.body.scrollHeight);
            
        } catch (e) {
            contentDiv.innerHTML += `<p style="color:red">Error generando ${chap.title}</p>`;
        }
    }
};

// --- PAGOS (ACTUALIZA FIREBASE) ---
window.showUpgrade = function() {
    document.getElementById('payment-modal').classList.remove('hidden');
};

window.closeModal = function() {
    document.getElementById('payment-modal').classList.add('hidden');
};

window.processPayment = async function(method) {
    // 1. Simular Pago
    alert("Redirigiendo a PayPal (Simulación)... Pago recibido en ballstefanie7@gmail.com");
    
    // 2. Si el pago es exitoso, actualizamos Firebase
    const user = auth.currentUser;
    if (user) {
        const userRef = doc(db, "users", user.uid);
        
        await updateDoc(userRef, {
            plan: "PRO"
        });
        
        // Actualizar interfaz localmente
        currentUserData.plan = "PRO";
        updateUI(currentUserData);
        
        alert("¡Pago exitoso! Ahora eres usuario PRO.");
        closeModal();
    }
};

window.exportFormat = async function(format) {
    if(format === 'pdf') {
        const title = "Mi Novela IA";
        const content = document.getElementById('book-content').innerText;
        
        const res = await fetch(`${API_URL}/export/pdf`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title, content })
        });
        
        if(res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "novela.pdf";
            document.body.appendChild(a); // Necesario para firefox
            a.click();
            a.remove();
        }
    } else {
        alert("Formato CBR/Word próximamente en versión v2");
    }
};
  
