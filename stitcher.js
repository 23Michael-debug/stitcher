"use strict";

/* ==========================================
   Stitcher Engine
========================================== */


/* ==========================================
   Load Image
========================================== */

function loadImage(file) {
    return new Promise((resolve, reject) => {

        const img = new Image();

        const url =
            URL.createObjectURL(file);

        img.onload = () => {

            URL.revokeObjectURL(url);

            resolve(img);
        };

        img.onerror = () => {

            URL.revokeObjectURL(url);

            reject(
                new Error(
                    `Failed to load image: ${file.name}`
                )
            );
        };

        img.src = url;
    });
}


/* ==========================================
   Get Output Width
========================================== */

function getOutputWidth(
    images,
    settings
) {

    if (
        !images ||
        images.length === 0
    ) {
        throw new Error(
            "No images available."
        );
    }


    if (
        settings.widthMode ===
        "custom"
    ) {

        const width =
            Number(
                settings.customWidth
            );

        if (
            !width ||
            width <= 0
        ) {
            throw new Error(
                "Invalid custom width."
            );
        }

        return Math.round(width);
    }


    if (
        settings.widthMode ===
        "first"
    ) {
        return images[0].naturalWidth;
    }


    return Math.max(
        ...images.map(
            img =>
                img.naturalWidth
        )
    );
}


/* ==========================================
   Split Images
========================================== */

function createSegments(
    images,
    maxHeight,
    spacing
) {

    const segments = [];

    let currentSegment = [];

    let currentHeight = 0;


    for (
        const image of images
    ) {

        let sourceY = 0;

        let remainingHeight =
            image.height;


        while (
            remainingHeight > 0
        ) {

            let availableHeight =
                maxHeight -
                currentHeight;


            if (
                currentSegment.length > 0
            ) {

                availableHeight -=
                    spacing;
            }


            if (
                availableHeight <= 0
            ) {

                if (
                    currentSegment.length > 0
                ) {

                    segments.push(
                        currentSegment
                    );
                }


                currentSegment = [];

                currentHeight = 0;

                continue;
            }


            const pieceHeight =
                Math.min(
                    remainingHeight,
                    availableHeight
                );


            currentSegment.push({
                image: image,
                sourceY: sourceY,
                height: pieceHeight
            });


            currentHeight +=
                pieceHeight;


            if (
                currentSegment.length > 1
            ) {

                currentHeight +=
                    spacing;
            }


            sourceY +=
                pieceHeight;


            remainingHeight -=
                pieceHeight;


            if (
                currentHeight >=
                    maxHeight &&
                remainingHeight > 0
            ) {

                segments.push(
                    currentSegment
                );

                currentSegment = [];

                currentHeight = 0;
            }
        }
    }


    if (
        currentSegment.length > 0
    ) {

        segments.push(
            currentSegment
        );
    }


    return segments;
}


/* ==========================================
   Create Canvas
========================================== */

function createCanvas(
    width,
    height,
    background
) {

    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        Math.max(
            1,
            Math.ceil(width)
        );


    canvas.height =
        Math.max(
            1,
            Math.ceil(height)
        );


    const ctx =
        canvas.getContext(
            "2d",
            {
                alpha:
                    background ===
                    "transparent"
            }
        );


    if (
        background ===
        "white"
    ) {

        ctx.fillStyle =
            "#ffffff";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }


    if (
        background ===
        "black"
    ) {

        ctx.fillStyle =
            "#000000";

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }


    return {
        canvas,
        ctx
    };
}


/* ==========================================
   Draw Segment
========================================== */

function drawSegment(
    segment,
    canvas,
    ctx,
    spacing,
    smoothing
) {

    ctx.imageSmoothingEnabled =
        smoothing;


    if (
        "imageSmoothingQuality"
        in ctx
    ) {

        ctx.imageSmoothingQuality =
            smoothing
                ? "high"
                : "low";
    }


    let y = 0;


    for (
        let i = 0;
        i < segment.length;
        i++
    ) {

        const piece =
            segment[i];


        const image =
            piece.image;


        if (i > 0) {
            y += spacing;
        }


        const sourceY =
            piece.sourceY /
            image.scale;


        const sourceHeight =
            piece.height /
            image.scale;


        ctx.drawImage(
            image.img,

            0,
            sourceY,
            image.img.naturalWidth,
            sourceHeight,

            0,
            y,
            image.width,
            piece.height
        );


        y +=
            piece.height;
    }
}


/* ==========================================
   Canvas → Blob
========================================== */

function canvasToBlob(
    canvas,
    format,
    quality,
    qualityEnabled
) {

    return new Promise(
        (resolve, reject) => {

            let mimeType =
                "image/png";


            if (
                format === "jpg"
            ) {
                mimeType =
                    "image/jpeg";
            }


            if (
                format === "webp"
            ) {
                mimeType =
                    "image/webp";
            }


            /*
             * Manual Quality ON:
             * use the exact quality selected
             * by the user.
             *
             * Manual Quality OFF:
             * use automatic compression.
             */

            let outputQuality =
                quality;


            if (
                !qualityEnabled &&
                (
                    format === "webp" ||
                    format === "jpg"
                )
            ) {
                outputQuality =
                    0.82;
            }


            /*
             * PNG does not use the quality
             * parameter in the same way.
             */

            canvas.toBlob(
                blob => {

                    if (!blob) {

                        reject(
                            new Error(
                                "Failed to create output image."
                            )
                        );

                        return;
                    }


                    resolve({
                        blob,
                        mimeType
                    });
                },
                mimeType,
                outputQuality
            );
        }
    );
}


/* ==========================================
   Main Stitch Function
========================================== */

async function stitchImages(
    imageItems,
    settings,
    onProgress
) {

    if (
        !imageItems ||
        imageItems.length === 0
    ) {

        throw new Error(
            "No images selected."
        );
    }


    /* --------------------------------------
       Settings
    -------------------------------------- */

    const maxHeight =
        Math.max(
            1,
            Number(
                settings.maxHeight
            ) || 12000
        );


    const spacing =
        Math.max(
            0,
            Number(
                settings.spacing
            ) || 0
        );


    const quality =
        Math.min(
            1,
            Math.max(
                0.01,
                Number(
                    settings.quality
                ) || 0.9
            )
        );


    const smoothing =
        settings.smoothing !== false;


    /* --------------------------------------
       Load images
    -------------------------------------- */

    const loadedImages = [];


    for (
        const item of imageItems
    ) {

        const img =
            await loadImage(
                item.file
            );


        loadedImages.push(
            img
        );


        // Give the browser time
        // between large images.
        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    0
                )
        );
    }


    /* --------------------------------------
       Output width
    -------------------------------------- */

    const outputWidth =
        getOutputWidth(
            loadedImages,
            settings
        );


    /* --------------------------------------
       Prepare images
    -------------------------------------- */

    const preparedImages = [];


    for (
        let i = 0;
        i < loadedImages.length;
        i++
    ) {

        const img =
            loadedImages[i];


        const scale =
            outputWidth /
            img.naturalWidth;


        const width =
            Math.round(
                img.naturalWidth *
                scale
            );


        const height =
            Math.round(
                img.naturalHeight *
                scale
            );


        preparedImages.push({

            img,

            width,

            height,

            scale
        });
    }


    /* --------------------------------------
       Create segments
    -------------------------------------- */

    const segments =
        createSegments(
            preparedImages,
            maxHeight,
            spacing
        );


    if (
        !segments ||
        segments.length === 0
    ) {

        throw new Error(
            "Unable to create output segments."
        );
    }


    /* --------------------------------------
       Progress
    -------------------------------------- */

    if (
        typeof onProgress ===
        "function"
    ) {

        onProgress(
            0,
            segments.length
        );
    }


    const results = [];


    /* --------------------------------------
       Render each segment
    -------------------------------------- */

    for (
        let i = 0;
        i < segments.length;
        i++
    ) {

        const segment =
            segments[i];


        let segmentHeight = 0;


        for (
            let j = 0;
            j < segment.length;
            j++
        ) {

            segmentHeight +=
                segment[j].height;


            if (j > 0) {
                segmentHeight +=
                    spacing;
            }
        }


        const {
            canvas,
            ctx
        } =
            createCanvas(
                outputWidth,
                segmentHeight,
                settings.background
            );


        drawSegment(
            segment,
            canvas,
            ctx,
            spacing,
            smoothing
        );


        const {
            blob,
            mimeType
        } =
            await canvasToBlob(
    canvas,
    settings.format,
    quality,
    settings.qualityEnabled
);


        results.push({

            index:
                i + 1,

            blob:

                blob,

            mimeType:

                mimeType,

            width:

                canvas.width,

            height:

                canvas.height
        });


        /* ----------------------------------
           Release canvas memory
        ---------------------------------- */

        canvas.width = 1;

        canvas.height = 1;


        /* ----------------------------------
           Progress
        ---------------------------------- */

        if (
            typeof onProgress ===
            "function"
        ) {

            onProgress(
                i + 1,
                segments.length
            );
        }


        /* ----------------------------------
           Allow browser cleanup
        ---------------------------------- */

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    0
                )
        );
    }


    /* --------------------------------------
       Release references
    -------------------------------------- */

    for (
        let i = 0;
        i < preparedImages.length;
        i++
    ) {

        preparedImages[i].img =
            null;
    }


    loadedImages.length = 0;

    preparedImages.length = 0;


    return results;
}


/* ==========================================
   Download Blob
========================================== */

function downloadBlob(
    blob,
    filename
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.download =
        filename;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );
}


/* ==========================================
   File Extension
========================================== */

function getExtension(
    format
) {

    if (
        format === "jpg"
    ) {
        return "jpg";
    }


    if (
        format === "webp"
    ) {
        return "webp";
    }


    return "png";
}