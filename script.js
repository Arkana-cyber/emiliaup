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

// Update Stats UI
const updateStats = () => {
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    if (totalHitsEl) totalHitsEl.textContent = history.length;
};

// --- LOGIKA UPLOAD & PREVIEW ---

if (dropZone) {
    // Klik area untuk pilih file
    dropZone.addEventListener('click', () => fileInput.click());

    // Efek Drag Over
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-600/10');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500', 'bg-blue-600/10');
    });

    // Handle Drop File
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-600/10');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handlePreview(files[0]);
        }
    });
}

// Handle saat input file berubah
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handlePreview(e.target.files[0]);
    }
});

// Fungsi untuk menampilkan gambar/video sebelum di-upload
function handlePreview(file) {
    uploadPlaceholder.classList.add('hidden');
    previewArea.classList.remove('hidden');
    previewArea.innerHTML = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        if (file.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = "max-h-48 mx-auto rounded-lg shadow-lg";
            previewArea.appendChild(img);
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = e.target.result;
            video.className = "max-h-48 mx-auto rounded-lg shadow-lg";
            video.controls = true;
            previewArea.appendChild(video);
        }
    };
    reader.readAsDataURL(file);
}

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
                        message: `Deploy: ${fileName}`,
                        content: content,
                        branch: GITHUB_AUTH.branch
                    })
                });

                if (res.ok) {
                    const url = `https://raw.githubusercontent.com/${GITHUB_AUTH.owner}/${GITHUB_AUTH.repo}/${GITHUB_AUTH.branch}/${fileName}`;
                    saveToHistory(file.name, url);
                    resolve(url);
                } else {
                    const errorData = await res.json();
                    reject(errorData.message || "API Error");
                }
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsDataURL(file);
    });
}

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

if (uploadBtn) {
    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return alert("Pilih file terlebih dahulu!");

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> DEPLOYING...';

        try {
            const url = await uploadToGitHub(file);
            urlOutput.value = url;
            resultBox.classList.remove('hidden');
            uploadBtn.innerHTML = '<i class="fas fa-check mr-2"></i> SUCCESS';
            
            navigator.clipboard.writeText(url);
            alert("Berhasil! URL telah disalin.");
        } catch (err) {
            console.error(err);
            alert("Upload Gagal: " + err);
            uploadBtn.innerHTML = "RETRY DEPLOYMENT";
        } finally {
            uploadBtn.disabled = false;
        }
    };
}

// ... sisanya (loadHistory, deleteHistoryItem) tetap sama ...
export function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('emilia_history', JSON.stringify(history));
    if (typeof loadHistory === 'function') loadHistory();
    updateStats();
}

export function loadHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    
    if (history.length === 0) {
        historyList.innerHTML = '<p class="text-white/20 col-span-full text-center">No assets deployed yet.</p>';
        return;
    }

    historyList.innerHTML = '';
    history.forEach(item => {
        const div = document.createElement('div');
        div.className = "glass-premium p-4 rounded-2xl flex flex-col gap-3 group relative overflow-hidden";
        // Cek apakah file adalah video berdasarkan ekstensi sederhana
        const isVideo = item.url.match(/\.(mp4|webm|ogg|mov)$/i);
        
        div.innerHTML = `
            <div class="w-full h-32 rounded-xl overflow-hidden bg-black/20 border border-white/5">
                ${isVideo ? 
                    `<video src="${item.url}" class="w-full h-full object-cover"></video>` :
                    `<img src="${item.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/400x300/0f172a/3b82f6?text=Asset'">`
                }
            </div>
            <div class="truncate">
                <p class="text-[10px] font-bold text-white uppercase truncate">${item.name}</p>
                <p class="text-[8px] text-white/40 uppercase tracking-tighter">${item.date}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="navigator.clipboard.writeText('${item.url}'); alert('Copied!')" class="flex-grow py-2 text-[10px] font-bold text-blue-400 bg-blue-600/10 rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase">
                    <i class="fas fa-copy mr-1"></i> Copy
                </button>
                <button onclick="window.deleteItem(${item.id})" class="px-3 py-2 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        historyList.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', updateStats);
        
