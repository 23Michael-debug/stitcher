"use strict";

/* =========================
State
========================= */

const images = [];

let draggedId = null;

/* =========================
Elements
========================= */

const fileInput =
document.getElementById("fileInput");

const addMoreButton =
document.getElementById("addMoreButton");

const clearButton =
document.getElementById("clearButton");

const themeButton =
document.getElementById("themeButton");

const sortSelect =
document.getElementById("sortSelect");

const imageCount =
document.getElementById("imageCount");

const imagesGrid =
document.getElementById("imagesGrid");

const toolbar =
document.getElementById("toolbar");

const imagesSection =
document.getElementById("imagesSection");

const emptyState =
document.getElementById("emptyState");

const settingsSection =
document.getElementById("settingsSection");

const resultsSection =
document.getElementById("resultsSection");

const resultsGrid =
document.getElementById("resultsGrid");

const resultsSummary =
document.getElementById("resultsSummary");

const originalImagesStat =
document.getElementById("originalImagesStat");

const outputFilesStat =
document.getElementById("outputFilesStat");

const totalSizeStat =
document.getElementById("totalSizeStat");

const maxHeightStat =
document.getElementById("maxHeightStat");

const maxHeightInput =
document.getElementById("maxHeight");

const widthModeSelect =
document.getElementById("widthMode");

const customWidthInput =
document.getElementById("customWidth");

const spacingInput =
document.getElementById("spacing");

const backgroundSelect =
document.getElementById("background");

const formatSelect =
document.getElementById("format");

const qualityToggle =
document.getElementById("qualityToggle");

const qualityControls =
document.getElementById("qualityControls");

const qualityInput =
document.getElementById("quality");

const qualityValue =
document.getElementById("qualityValue");

const smoothingInput =
document.getElementById("smoothing");

const stitchButton =
document.getElementById("stitchButton");

const progressSection =
document.getElementById("progressSection");

const progressBar =
document.getElementById("progressBar");

const progressText =
document.getElementById("progressText");

const progressPercent =
document.getElementById("progressPercent");

const zipNameInput =
document.getElementById("zipName");

const downloadZipButton =
document.getElementById("downloadZipButton");

const previewModal =
    document.getElementById("previewModal");

const previewImage =
    document.getElementById("previewImage");

const previewTitle =
    document.getElementById("previewTitle");

const previewInfo =
    document.getElementById("previewInfo");

const previewSize =
    document.getElementById("previewSize");

const closePreviewButton =
    document.getElementById("closePreviewButton");

const previewDownloadButton =
    document.getElementById("previewDownloadButton");

let currentPreviewResult = null;
/* =========================
Settings
========================= */

widthModeSelect.addEventListener(
"change",
function () {

    const isCustom =
        widthModeSelect.value === "custom";

    customWidthInput.classList.toggle(
        "hidden",
        !isCustom
    );
}

);

qualityToggle.addEventListener(
    "change",
    function () {

        const enabled =
            qualityToggle.checked;

        qualityControls.classList.toggle(
            "hidden",
            !enabled
        );

        qualityInput.disabled =
            !enabled;
    }
);


qualityInput.addEventListener(
    "input",
    function () {

        qualityValue.textContent =
            qualityInput.value + "%";
    }
);

/* =========================
File Input
========================= */

fileInput.addEventListener(
    "change",
    async function () {

        const selectedFiles =
            Array.from(fileInput.files);

        await addFiles(selectedFiles);

        fileInput.value = "";
    }
);

addMoreButton.addEventListener(
"click",
function () {

    fileInput.click();
}

);

/* =========================
Add Files
========================= */

async function addFiles(files) {
    for (const file of files) {

        if (
            file.type === "application/zip" ||
            file.name.toLowerCase().endsWith(".zip")
        ) {
            try {
                const zipImages =
                    await extractImagesFromZip(file);

                for (const imageFile of zipImages) {
                    addSingleImage(imageFile);
                }

            } catch (error) {
                console.error(error);

                alert(
                    `Unable to read ZIP file "${file.name}".\n\n` +
                    error.message
                );
            }

        } else if (file.type.startsWith("image/")) {
            addSingleImage(file);
        }
    }

    render();
}


function addSingleImage(file) {

    const id =
        crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now() + "-" + Math.random();


    const item = {
        id: id,
        file: file,
        name: file.name,
        url: URL.createObjectURL(file)
    };


    images.push(item);
}


/* =========================
Remove Image
========================= */

function removeImage(id) {

const index =
    images.findIndex(
        image => image.id === id
    );


if (index === -1) {
    return;
}


URL.revokeObjectURL(
    images[index].url
);


images.splice(index, 1);

render();

}

/* =========================
Clear All
========================= */

clearButton.addEventListener(
"click",
function () {

    if (images.length === 0) {
        return;
    }


    for (const image of images) {

        URL.revokeObjectURL(
            image.url
        );
    }


    images.length = 0;

    render();
}

);

/* =========================
Sorting
========================= */

sortSelect.addEventListener(
"change",
function () {

    sortImages(sortSelect.value);

    render();
}

);

function sortImages(mode) {

if (mode === "manual") {
    return;
}


if (mode === "nameAsc") {

    images.sort(
        (a, b) =>
            a.name.localeCompare(
                b.name,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            )
    );

    return;
}


if (mode === "nameDesc") {

    images.sort(
        (a, b) =>
            b.name.localeCompare(
                a.name,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            )
    );

    return;
}


if (
    mode === "numberAsc" ||
    mode === "numberDesc"
) {

    images.sort(
        (a, b) => {

            const aNumber =
                extractNumber(a.name);

            const bNumber =
                extractNumber(b.name);


            if (aNumber === bNumber) {

                return a.name.localeCompare(
                    b.name,
                    undefined,
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                );
            }


            return mode === "numberAsc"
                ? aNumber - bNumber
                : bNumber - aNumber;
        }
    );
}

}

function extractNumber(name) {

const matches =
    name.match(/\d+/g);


if (!matches) {
    return Number.MAX_SAFE_INTEGER;
}


return Number(
    matches.join("")
);

}

/* =========================
Render
========================= */

function render() {

imageCount.textContent =
    images.length +
    (images.length === 1
        ? " Image"
        : " Images");


const hasImages =
    images.length > 0;


toolbar.classList.toggle(
    "hidden",
    !hasImages
);


imagesSection.classList.toggle(
    "hidden",
    !hasImages
);


emptyState.classList.toggle(
    "hidden",
    hasImages
);


settingsSection.classList.toggle(
    "hidden",
    !hasImages
);


imagesGrid.innerHTML = "";


for (
    let index = 0;
    index < images.length;
    index++
) {

    const image =
        images[index];


    const card =
        document.createElement("article");


    card.className =
        "image-card";


    card.draggable = true;

    card.dataset.id =
        image.id;


    card.innerHTML = `
        <img
            class="image-preview"
            src="${image.url}"
            alt=""
        >

        <button
            class="remove-button"
            type="button"
            aria-label="Remove image"
        >
            ×
        </button>

        <div class="image-info">

            <div class="image-number">
                ${index + 1}
            </div>

            <div
                class="image-name"
                title="${escapeHtml(image.name)}"
            >
                ${escapeHtml(image.name)}
            </div>

        </div>
    `;


    const removeButton =
        card.querySelector(
            ".remove-button"
        );


    removeButton.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            removeImage(image.id);
        }
    );


    card.addEventListener(
        "dragstart",
        function () {

            draggedId =
                image.id;

            card.classList.add(
                "dragging"
            );
        }
    );


    card.addEventListener(
        "dragend",
        function () {

            draggedId = null;

            card.classList.remove(
                "dragging"
            );
        }
    );


    card.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();
        }
    );


    card.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            if (!draggedId) {
                return;
            }

            if (
                draggedId === image.id
            ) {
                return;
            }


            moveImage(
                draggedId,
                image.id
            );
        }
    );


    imagesGrid.appendChild(card);
}

}

/* =========================
Manual Reorder
========================= */

function moveImage(
draggedImageId,
targetImageId
) {

const fromIndex =
    images.findIndex(
        image =>
            image.id === draggedImageId
    );


const toIndex =
    images.findIndex(
        image =>
            image.id === targetImageId
    );


if (
    fromIndex === -1 ||
    toIndex === -1
) {
    return;
}


const [movedImage] =
    images.splice(
        fromIndex,
        1
    );


images.splice(
    toIndex,
    0,
    movedImage
);


sortSelect.value = "manual";

render();

}

/* =========================
Theme
========================= */

themeButton.addEventListener(
"click",
function () {

    const isLight =
        document.body.classList.toggle(
            "light"
        );


    localStorage.setItem(
        "stitcher-theme",
        isLight
            ? "light"
            : "dark"
    );


    updateThemeButton();
}

);

function loadTheme() {

const savedTheme =
    localStorage.getItem(
        "stitcher-theme"
    );


if (savedTheme === "light") {

    document.body.classList.add(
        "light"
    );
}


updateThemeButton();

}

function updateThemeButton() {

const isLight =
    document.body.classList.contains(
        "light"
    );


themeButton.textContent =
    isLight
        ? "☾"
        : "☼";

}

/* =========================
HTML Escape
========================= */

function escapeHtml(value) {

return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}

/* =========================
Format File Size
========================= */

function formatFileSize(bytes) {

if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
}


const units = [
    "B",
    "KB",
    "MB",
    "GB"
];


let size = bytes;
let unitIndex = 0;


while (
    size >= 1024 &&
    unitIndex < units.length - 1
) {

    size /= 1024;
    unitIndex++;
}


const decimals =
    unitIndex === 0
        ? 0
        : size >= 100
            ? 0
            : size >= 10
                ? 1
                : 2;


return (
    size.toFixed(decimals) +
    " " +
    units[unitIndex]
);

}

/* =========================
Stitch
========================= */

stitchButton.addEventListener(
"click",
async function () {

    if (images.length === 0) {
        return;
    }


    stitchButton.disabled = true;

    progressSection.classList.remove(
        "hidden"
    );


    resultsSection.classList.add(
        "hidden"
    );


    resultsGrid.innerHTML = "";


    downloadZipButton.classList.add(
        "hidden"
    );


    setProgress(
        0,
        "Preparing images..."
    );


    try {

        const settings =
            getSettings();


        const result =
            await stitchImages(
                images,
                settings,
                (progress, total) => {

                    const safeTotal =
                        Number(total) || 0;

                    const current =
                        Math.min(
                            Math.max(
                                0,
                                Number(progress) || 0
                            ),
                            safeTotal
                        );


                    if (safeTotal > 0) {

                        const percent =
                            Math.round(
                                (current / safeTotal) *
                                100
                            );


                        const text =
                            current === 0
                                ? "Preparing output..."
                                : `Stitching output ${current} of ${safeTotal}...`;


                        setProgress(
                            percent,
                            text
                        );

                    } else {

                        setProgress(
                            0,
                            "Stitching..."
                        );
                    }
                }
            );


        renderResults(
            result,
            settings
        );


        setProgress(
            100,
            "Completed"
        );


    } catch (error) {

        console.error(error);

        setProgress(
            0,
            "Stitching failed"
        );


        alert(
            "Unable to stitch the images.\n\n" +
            error.message
        );


    } finally {

        stitchButton.disabled = false;
    }
}

);

/* =========================
Get Settings
========================= */

function getSettings() {

let maxHeight =
    Number(maxHeightInput.value);


if (
    !Number.isFinite(maxHeight) ||
    maxHeight < 1
) {

    maxHeight = 12000;
}


let spacing =
    Number(spacingInput.value);


if (
    !Number.isFinite(spacing) ||
    spacing < 0
) {

    spacing = 0;
}


let customWidth =
    Number(customWidthInput.value);


if (
    !Number.isFinite(customWidth) ||
    customWidth < 1
) {

    customWidth = 1080;
}


return {

    maxHeight,

    widthMode:
        widthModeSelect.value,

    customWidth,

    spacing,

    background:
        backgroundSelect.value,

    format:
        formatSelect.value,

    qualityEnabled:
    qualityToggle.checked,

quality:
    Number(qualityInput.value) / 100,

    smoothing:
        smoothingInput.checked
};

}

/* =========================
Progress
========================= */

function setProgress(
percent,
text
) {

const safePercent =
    Math.max(
        0,
        Math.min(
            100,
            percent
        )
    );


progressBar.style.width =
    safePercent + "%";


progressPercent.textContent =
    safePercent + "%";


progressText.textContent =
    text;

}

/* =========================
Render Results
========================= */

function renderResults(
    results,
    settings
) {

    window.currentResults =
        results;

    window.currentSettings =
        settings;


    resultsSection.classList.remove(
        "hidden"
    );


    const totalBytes =
        results.reduce(
            (total, result) =>
                total +
                (
                    result.blob
                        ? result.blob.size
                        : 0
                ),
            0
        );


    resultsSummary.textContent =
        results.length +
        (
            results.length === 1
                ? " output image created."
                : " output images created."
        );


    originalImagesStat.textContent =
        images.length;


    outputFilesStat.textContent =
        results.length;


    totalSizeStat.textContent =
        formatFileSize(totalBytes);


    maxHeightStat.textContent =
        Number(settings.maxHeight).toLocaleString() +
        " px";


    resultsGrid.innerHTML = "";


    for (const result of results) {

        const card =
            document.createElement("article");


        card.className =
            "result-card";


        const url =
            URL.createObjectURL(
                result.blob
            );


        const extension =
            getExtension(
                settings.format
            );


        card.innerHTML = `

            <div class="result-preview-wrapper">

                <img
                    class="result-preview"
                    src="${url}"
                    alt="Stitched result ${result.index}"
                >

            </div>


            <div class="result-info">

                <div>

                    <strong>
                        ${result.index}.${extension}
                    </strong>

                    <small>
                        ${result.width.toLocaleString()} × ${result.height.toLocaleString()} px
                    </small>

                    <small class="result-size">
                        ${formatFileSize(result.blob.size)}
                    </small>

                </div>


                <button
                    class="download-result"
                    type="button"
                >
                    Download
                </button>

            </div>
        `;


        /* Preview */

        card.querySelector(
            ".result-preview"
        ).addEventListener(
            "click",
            function () {

                openPreview(
                    result,
                    url,
                    extension
                );
            }
        );


        /* Download */

        const downloadButton =
            card.querySelector(
                ".download-result"
            );


        downloadButton.addEventListener(
            "click",
            function () {

                downloadBlob(
                    result.blob,
                    result.index +
                    "." +
                    extension
                );
            }
        );


        resultsGrid.appendChild(card);
    }


    downloadZipButton.classList.remove(
        "hidden"
    );

}

/* =========================
ZIP Download
========================= */

downloadZipButton.addEventListener(
"click",
async function () {

    if (
        !window.currentResults ||
        window.currentResults.length === 0
    ) {
        return;
    }


    downloadZipButton.disabled = true;


    try {

        let zipName =
            zipNameInput.value.trim();


        if (!zipName) {
            zipName = "Stitched";
        }


        if (
            zipName
                .toLowerCase()
                .endsWith(".zip")
        ) {

            zipName =
                zipName.slice(
                    0,
                    -4
                );
        }


        zipName =
            zipName
                .replace(
                    /[\\/:*?"<>|]/g,
                    "_"
                )
                .trim();


        if (!zipName) {
            zipName = "Stitched";
        }


        const extension =
            getExtension(
                window.currentSettings.format
            );


        const files =
            window.currentResults.map(
                result => ({

                    name:
                        result.index +
                        "." +
                        extension,

                    blob:
                        result.blob

                })
            );


        const zipBlob =
            await ZipWriter.create(
                files
            );


        downloadBlob(
            zipBlob,
            zipName + ".zip"
        );


    } catch (error) {

        console.error(error);


        alert(
            "Unable to create ZIP.\n\n" +
            error.message
        );


    } finally {

        downloadZipButton.disabled = false;
    }
}

);

/* =========================
Start
========================= */

loadTheme();

render();
/* =========================
   Preview Modal
========================= */

function openPreview(
    result,
    url,
    extension
) {
  
    currentPreviewResult = {
        result,
        url,
        extension
    };


    previewImage.src =
        url;


    previewTitle.textContent =
        result.index +
        "." +
        extension;


    previewInfo.textContent =
        result.width.toLocaleString() +
        " × " +
        result.height.toLocaleString() +
        " px";


    previewSize.textContent =
        formatFileSize(
            result.blob.size
        );


    previewModal.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";


    previewImage.focus?.();
}


/* =========================
   Close Preview
========================= */

function closePreview() {

    previewModal.classList.add(
        "hidden"
    );


    previewImage.src = "";


    currentPreviewResult = null;


    document.body.style.overflow =
        "";
}


closePreviewButton.addEventListener(
    "click",
    closePreview
);


previewModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            previewModal
        ) {

            closePreview();
        }
    }
);


document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape" &&
            !previewModal.classList.contains(
                "hidden"
            )
        ) {

            closePreview();
        }
    }
);


/* =========================
   Preview Download
========================= */

previewDownloadButton.addEventListener(
    "click",
    function () {

        if (
            !currentPreviewResult
        ) {
            return;
        }


        downloadBlob(
            currentPreviewResult.result.blob,

            currentPreviewResult.result.index +
            "." +
            currentPreviewResult.extension
        );
    }
);