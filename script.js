const GITHUB_AUTH = {
    token: import.meta.env.VITE_GITHUB_TOKEN,
    owner: import.meta.env.VITE_GITHUB_OWNER,
    repo: import.meta.env.VITE_GITHUB_REPO,
    branch: import.meta.env.VITE_GITHUB_BRANCH
};

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const uploadBtn = document.getElementById('upload-btn');
const totalHitsEl = document.getElementById('total-hits');
const resultBox = document.getElementById('result-box');
const urlOutput = document.getElementById('url-output');
const previewArea = document.getElementById('preview-area');
const uploadPlaceholder = document.getElementById('upload-placeholder');

// --- SISTEM KLIK & DRAG-DROP ---

if (dropZone) {
    // 1. Memastikan klik pada area kaca memicu pilih file
    dropZone.addEventListener('click', (e) => {
        // Mencegah klik ganda jika yang ditekan adalah input itu sendiri
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    // 2. Efek Visual saat file ditarik ke atas kotak
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#3b82f6";
        dropZone.style.background = "rgba(56, 189, 248, 0.1)";
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = "";
        dropZone.style.background = "";
    });

    // 3. Menangani file yang dilepas (Drop)
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "";
        dropZone.style.background = "";
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            showPreview(e.dataTransfer.files[0]);
        }
    });
}

// 4. Menampilkan Preview saat file dipilih via tombol
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        showPreview(fileInput.files[0]);
    }
});

function showPreview(file) {
    uploadPlaceholder.classList.add('hidden');
    previewArea.classList.remove('hidden');
    previewArea.innerHTML = ''; // Reset preview lama

    const reader = new FileReader();
    reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = "max-h-48 mx-auto rounded-2xl shadow-2xl border border-white/10";
            previewArea.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.controls = true;
            video.className = "max-h-48 mx-auto rounded-2xl shadow-2xl";
            previewArea.appendChild(video);
        }
    };
    reader.readAsDataURL(file);
}

// --- LOGIKA UPLOAD KE GITHUB ---

async function uploadToGitHub(file) {
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async () => {
            const content = reader.result.split(',')[1];
            try {
                const res = await fetch(`https://api.github.com/repos/${GITHUB_AUTH.owner}/${GITHUB_AUTH.repo}/contents/${fileName}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_AUTH.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Upload: ${fileName}`,
                        content: content,
                        branch: GITHUB_AUTH.branch
                    })
                });

                if (res.ok) {
                    const url = `https://raw.githubusercontent.com/${GITHUB_AUTH.owner}/${GITHUB_AUTH.repo}/${GITHUB_AUTH.branch}/${fileName}`;
                    saveToHistory(file.name, url);
                    resolve(url);
                } else {
                    const errRes = await res.json();
                    reject(errRes.message || "Gagal upload ke GitHub");
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

// --- TOMBOL INITIALIZE DEPLOYMENT ---

if (uploadBtn) {
    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return alert("Pilih file (gambar/video) dulu!");

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> PROCESSING...';

        try {
            const url = await uploadToGitHub(file);
            urlOutput.value = url;
            resultBox.classList.remove('hidden');
            uploadBtn.innerHTML = '<i class="fas fa-check mr-2"></i> DEPLOYED';
            
            navigator.clipboard.writeText(url);
            alert("Berhasil Diupload! Link sudah disalin.");
        } catch (err) {
            console.error(err);
            alert("Error: " + err);
            uploadBtn.innerHTML = '<i class="fas fa-bolt-lightning mr-2"></i> RETRY DEPLOY';
        } finally {
            uploadBtn.disabled = false;
        }
    };
}

// --- FUNGSI HISTORY ---

function saveToHistory(name, url) {
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    history.unshift({ 
        id: Date.now(), 
        name, 
        url, 
        date: `${dateStr} - ${timeStr}` 
    });
    localStorage.setItem('emilia_history', JSON.stringify(history));
    updateStats();
}

const updateStats = () => {
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    if (totalHitsEl) totalHitsEl.textContent = history.length;
};

// Agar bisa dihapus dari index.html jika perlu
window.deleteItem = (id) => {
    let history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('emilia_history', JSON.stringify(history));
    location.reload();
};

document.addEventListener('DOMContentLoaded', updateStats);
        
