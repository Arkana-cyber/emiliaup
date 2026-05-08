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

// Update Stats UI
const updateStats = () => {
    const history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    if (totalHitsEl) totalHitsEl.textContent = history.length;
};

// Handle Drag & Click
if (dropZone) {
    dropZone.onclick = () => fileInput.click();
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
                    reject("API Error");
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
    // Menambah detail tanggal dan jam (ya)
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

// Fungsi Hapus Satuan (ya)
export function deleteHistoryItem(id) {
    let history = JSON.parse(localStorage.getItem('emilia_history') || '[]');
    history = history.filter(item => item.id !== id);
    localStorage.setItem('emilia_history', JSON.stringify(history));
    loadHistory();
    updateStats();
}

if (uploadBtn) {
    uploadBtn.onclick = async () => {
        const file = fileInput.files[0];
        if (!file) return alert("Please select a file first!");

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> DEPLOYING...';

        try {
            const url = await uploadToGitHub(file);
            urlOutput.value = url;
            resultBox.classList.remove('hidden');
            uploadBtn.innerHTML = '<i class="fas fa-check mr-2"></i> SUCCESS';
            
            navigator.clipboard.writeText(url);
            alert("Success! URL Copied to clipboard.");
        } catch (err) {
            alert("Upload Failed!");
            uploadBtn.innerHTML = "RETRY DEPLOYMENT";
        } finally {
            uploadBtn.disabled = false;
        }
    };
}

if (document.getElementById('copy-btn')) {
    document.getElementById('copy-btn').onclick = () => {
        urlOutput.select();
        document.execCommand('copy');
        alert("URL Copied!");
    };
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
        // Grid layout dengan pratinjau gambar (ya)
        div.className = "glass-premium p-4 rounded-2xl flex flex-col gap-3 group relative overflow-hidden";
        div.innerHTML = `
            <div class="w-full h-32 rounded-xl overflow-hidden bg-black/20 border border-white/5">
                <img src="${item.url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/400x300/0f172a/3b82f6?text=Video+or+File'">
            </div>
            <div class="truncate">
                <p class="text-[10px] font-bold text-white uppercase truncate">${item.name}</p>
                <p class="text-[8px] text-white/40 uppercase tracking-tighter">${item.date}</p>
                <p class="text-[9px] text-blue-400 truncate mt-1">${item.url}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="navigator.clipboard.writeText('${item.url}'); alert('Copied!')" class="flex-grow py-2 text-[10px] font-bold text-blue-400 bg-blue-600/10 rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase">
                    <i class="fas fa-copy mr-1"></i> Copy Link
                </button>
                <button onclick="window.deleteItem(${item.id})" class="px-3 py-2 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>`;
        historyList.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', updateStats);
