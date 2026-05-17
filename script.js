// Konfigurasi GitHub menggunakan Environment Variables (Vite) / Fallback langsung ke file .env jika murni statis
const GITHUB_AUTH = {
    token: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GITHUB_TOKEN : "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", 
    owner: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GITHUB_OWNER : "Arkana-cyber",
    repo: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GITHUB_REPO : "images-",
    branch: (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env.VITE_GITHUB_BRANCH : "main"
};

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const uploadBtn = document.getElementById('upload-btn');
const previewArea = document.getElementById('preview-area');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const urlOutput = document.getElementById('url-output');
const resultBox = document.getElementById('result-box');
const totalHitsEl = document.getElementById('total-hits');

// --- 1. LOGIKA PREVIEW ---
function handlePreview(file) {
    if (!file) return;

    if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
    if (previewArea) {
        previewArea.classList.remove('hidden');
        previewArea.innerHTML = '<div class="text-blue-400 text-xs animate-pulse uppercase tracking-widest">Processing...</div>';
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        if (!previewArea) return;
        previewArea.innerHTML = '';
        if (file.type.startsWith('image/')) {
            previewArea.innerHTML = `
                <img src="${e.target.result}" class="max-h-64 rounded-2xl shadow-2xl border border-white/10 mb-4 object-cover">
                <p class="text-blue-400 text-[10px] font-bold uppercase tracking-widest truncate max-w-xs">${file.name}</p>
            `;
        } else if (file.type.startsWith('video/')) {
            previewArea.innerHTML = `
                <div class="p-8 bg-blue-600/10 rounded-2xl border border-blue-500/20 mb-4">
                    <i class="fas fa-video text-4xl text-blue-500 mb-2"></i>
                </div>
                <p class="text-white text-[10px] font-bold uppercase tracking-widest truncate max-w-xs">${file.name}</p>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// --- 2. EVENT LISTENER ---
if (dropZone) {
    dropZone.onclick = () => fileInput.click();

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-500/5');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-blue-500', 'bg-blue-500/5');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-500/5');
        const files = e.dataTransfer.files;
        if (files.length > 0 && fileInput) {
            fileInput.files = files;
            handlePreview(files[0]);
        }
    });
}

if (fileInput) {
    fileInput.onchange = (e) => {
        handlePreview(e.target.files[0]);
    };
}

// --- 3. LOGIKA UPLOAD KE GITHUB ---
async function uploadToGitHub(file) {
    if (!GITHUB_AUTH.token) {
        throw new Error("API Token tidak ditemukan. Periksa konfigurasi token Anda.");
    }

    const randomId = Math.random().toString(36).substring(2, 8);
    const fileExt = file.name.split('.').pop();
    const fileName = `media/${randomId}.${fileExt}`;
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64Content = reader.result.split(',')[1];
            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_AUTH.owner}/${GITHUB_AUTH.repo}/contents/${fileName}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_AUTH.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Upload via Emilia: ${fileName}`,
                        content: base64Content,
                        branch: GITHUB_AUTH.branch
                    })
                });

                if (response.ok) {
                    resolve(`https://emilia-uploader.vercel.app/files?filepath=${fileName}`);
                } else {
                    const data = await response.json();
                    reject(data.message || "Upload Gagal");
                }
            } catch (err) {
                reject("Kesalahan Jaringan");
            }
        };
    });
}

// Tombol Upload Execution
if (uploadBtn) {
    uploadBtn.onclick = async () => {
        const file = fileInput.files ? fileInput.files[0] : null;
        if (!file) return alert("Pilih file terlebih dahulu!");

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> DEPLOYING...';

        try {
            const url = await uploadToGitHub(file);
            if (urlOutput) urlOutput.value = url;
            if (resultBox) resultBox.classList.remove('hidden');
            uploadBtn.innerHTML = '<i class="fas fa-check mr-2"></i> DEPLOYED';
            
            // Simpan ke History (LocalStorage)
            const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
            history.unshift({ 
                id: Date.now(), 
                name: file.name, 
                url: url, 
                date: new Date().toLocaleString('id-ID') 
            });
            localStorage.setItem('emilia_history', JSON.stringify(history));
            
            if (totalHitsEl) totalHitsEl.textContent = history.length;

            navigator.clipboard.writeText(url);
            alert("Berhasil diupload & Link disalin!");
        } catch (err) {
            alert("Gagal: " + err);
            uploadBtn.innerHTML = '<i class="fas fa-redo mr-2"></i> RETRY';
        } finally {
            uploadBtn.disabled = false;
        }
    };
}

// Tombol Salin
const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
    copyBtn.onclick = () => {
        if (urlOutput) {
            urlOutput.select();
            navigator.clipboard.writeText(urlOutput.value);
            alert("Salin ke papan klip!");
        }
    };
}

// Muat statistik awal di index
document.addEventListener('DOMContentLoaded', () => {
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    if (totalHitsEl) totalHitsEl.textContent = history.length;
});

// --- 4. FUNGSI EKSPORES UNTUK HALAMAN HISTORY ---
export function loadHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="col-span-full text-center py-20 opacity-40">
                <i class="fas fa-folder-open text-4xl mb-4 text-slate-500"></i>
                <p class="uppercase tracking-widest text-xs">No Assets Deployed Yet</p>
            </div>
        `;
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="glass-premium rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group border border-white/5 hover:border-blue-500/30 transition-all">
            <div class="flex items-start justify-between gap-2 mb-4">
                <div class="overflow-hidden">
                    <p class="text-white font-semibold text-sm truncate uppercase tracking-wide" title="${item.name}">${item.name}</p>
                    <p class="text-[9px] text-white/30 tracking-widest mt-1">${item.date}</p>
                </div>
                <button onclick="deleteItem(${item.id})" class="text-slate-500 hover:text-red-400 text-xs p-1 transition-colors">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="flex gap-2 mt-2">
                <input type="text" readonly value="${item.url}" class="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono text-blue-300/80">
                <button onclick="navigator.clipboard.writeText('${item.url}'); alert('Link disalin!');" class="bg-blue-600/20 px-3 rounded-lg border border-blue-500/20 hover:bg-blue-600 transition-all text-blue-400 hover:text-white">
                    <i class="fas fa-copy text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

export function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('emilia_history', JSON.stringify(history));
    loadHistory();
}
