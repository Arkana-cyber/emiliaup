const CONFIG = {
    token: "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", 
    owner: "Arkana-cyber",
    repo: "images-",
    branch: "main"
};

const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const uploadBtn = document.getElementById('upload-btn');
const resultBox = document.getElementById('result-box');
const urlOutput = document.getElementById('url-output');
const historyList = document.getElementById('history-list');
const previewArea = document.getElementById('preview-area');
const placeholder = document.getElementById('upload-placeholder');

// Deteksi otomatis domain (Localhost vs Vercel)
const getBaseUrl = () => {
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" 
        ? `${window.location.protocol}//${window.location.host}` 
        : "https://emilia-uploader.vercel.app";
};

dropZone.onclick = () => fileInput.click();

fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (file) {
        placeholder.classList.add('hidden');
        previewArea.classList.remove('hidden');
        previewArea.innerHTML = '<div class="text-blue-400 text-sm animate-pulse">Generating Preview...</div>';

        const reader = new FileReader();
        reader.onload = (e) => {
            previewArea.innerHTML = ''; 
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = e.target.result;
                previewArea.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = e.target.result;
                video.controls = true;
                previewArea.appendChild(video);
            }
        };
        reader.readAsDataURL(file);
    }
};

uploadBtn.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return alert("Select a file to deploy!");

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<i class="fas fa-spinner animate-spin"></i> DEPLOYING...`;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const fileName = `media/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${fileName}`;

        try {
            const res = await fetch(apiUrl, {
                method: "PUT",
                headers: { 
                    "Authorization": `token ${CONFIG.token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: `Cloud Upload: ${file.name}`,
                    content: base64,
                    branch: CONFIG.branch
                })
            });

            const data = await res.json();

            if (res.ok) {
                // AMBIL 6 DIGIT ID DARI SHA GITHUB
                const githubId = data.content.sha.substring(0, 6);
                const fileExt = file.name.split('.').pop();
                
                // Susun URL sesuai permintaan: id.ekstensi
                const finalUrl = `${getBaseUrl()}/files?filepath=media/${githubId}.${fileExt}`;
                
                urlOutput.value = finalUrl;
                resultBox.classList.remove('hidden');
                addToHistory(`${githubId}.${fileExt}`, finalUrl);
                alert("Asset Deployed Successfully!");
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (e) {
            alert("Connection Lost.");
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = `<i class="fas fa-paper-plane"></i> INITIALIZE UPLOAD`;
        }
    };
};

function addToHistory(name, url) {
    const empty = document.getElementById('empty-history');
    if (empty) empty.remove();
    const div = document.createElement('div');
    div.className = "history-card p-4 rounded-xl flex items-center justify-between mb-3";
    div.innerHTML = `
        <div class="truncate max-w-[80%]">
            <p class="text-xs font-bold text-white truncate">${name}</p>
            <p class="text-[10px] text-blue-500 font-mono truncate mt-1">${url}</p>
        </div>
        <button onclick="copyToClipboard('${url}')" class="text-slate-500 hover:text-blue-400 p-2">
            <i class="fas fa-copy"></i>
        </button>`;
    historyList.prepend(div);
}

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("URL copied!");
};

document.getElementById('copy-btn').onclick = () => copyToClipboard(urlOutput.value);
