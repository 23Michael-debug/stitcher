"use strict";

/* ==========================================
   Simple ZIP Writer
========================================== */

const ZipWriter = (() => {

    /* ======================================
       CRC-32
    ====================================== */

    const crcTable = new Uint32Array(256);

    for (let n = 0; n < 256; n++) {

        let c = n;

        for (let k = 0; k < 8; k++) {
            c =
                (c & 1)
                    ? 0xEDB88320 ^ (c >>> 1)
                    : c >>> 1;
        }

        crcTable[n] = c >>> 0;
    }


    function crc32(data) {

        let crc = 0xFFFFFFFF;

        for (let i = 0; i < data.length; i++) {

            crc =
                crcTable[
                    (crc ^ data[i]) & 0xFF
                ] ^
                (crc >>> 8);
        }

        return (crc ^ 0xFFFFFFFF) >>> 0;
    }


    /* ======================================
       UTF-8
    ====================================== */

    function encodeText(text) {
        return new TextEncoder().encode(text);
    }


    /* ======================================
       Little Endian Helpers
    ====================================== */

    function uint16(value) {

        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF
        ]);
    }


    function uint32(value) {

        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 24) & 0xFF
        ]);
    }


    /* ======================================
       Concatenate Arrays
    ====================================== */

    function concatArrays(arrays) {

        let totalLength = 0;

        for (const array of arrays) {
            totalLength += array.length;
        }

        const result =
            new Uint8Array(totalLength);

        let offset = 0;

        for (const array of arrays) {

            result.set(
                array,
                offset
            );

            offset += array.length;
        }

        return result;
    }


    /* ======================================
       Create ZIP
    ====================================== */

    async function create(files) {

        const localParts = [];
        const centralParts = [];

        let offset = 0;

        for (let i = 0; i < files.length; i++) {

            const file = files[i];

            const data =
                new Uint8Array(
                    await file.blob.arrayBuffer()
                );

            const filename =
                encodeText(file.name);

            const crc =
                crc32(data);

            const size =
                data.length;


            /* ==============================
               Local File Header
            ============================== */

            const localHeader =
                concatArrays([

                    // Local file signature
                    uint32(0x04034B50),

                    // Version needed
                    uint16(20),

                    // General purpose flags
                    uint16(0x0800),

                    // Compression method: STORE
                    uint16(0),

                    // File time
                    uint16(0),

                    // File date
                    uint16(0),

                    // CRC-32
                    uint32(crc),

                    // Compressed size
                    uint32(size),

                    // Uncompressed size
                    uint32(size),

                    // Filename length
                    uint16(filename.length),

                    // Extra field length
                    uint16(0),

                    // Filename
                    filename
                ]);


            localParts.push(
                localHeader,
                data
            );


            /* ==============================
               Central Directory Entry
            ============================== */

            const centralHeader =
                concatArrays([

                    // Central directory signature
                    uint32(0x02014B50),

                    // Version made by
                    uint16(20),

                    // Version needed
                    uint16(20),

                    // General purpose flags
                    uint16(0x0800),

                    // Compression method
                    uint16(0),

                    // File time
                    uint16(0),

                    // File date
                    uint16(0),

                    // CRC-32
                    uint32(crc),

                    // Compressed size
                    uint32(size),

                    // Uncompressed size
                    uint32(size),

                    // Filename length
                    uint16(filename.length),

                    // Extra field length
                    uint16(0),

                    // Comment length
                    uint16(0),

                    // Disk number
                    uint16(0),

                    // Internal attributes
                    uint16(0),

                    // External attributes
                    uint32(0),

                    // Relative offset
                    uint32(offset),

                    // Filename
                    filename
                ]);


            centralParts.push(
                centralHeader
            );


            offset +=
                localHeader.length +
                data.length;
        }


        /* ==================================
           Central Directory
        ================================== */

        const centralDirectory =
            concatArrays(centralParts);


        const localData =
            concatArrays(localParts);


        const centralOffset =
            localData.length;


        /* ==================================
           End Of Central Directory
        ================================== */

        const endRecord =
            concatArrays([

                // Signature
                uint32(0x06054B50),

                // Disk number
                uint16(0),

                // Central directory disk
                uint16(0),

                // Number of entries on disk
                uint16(files.length),

                // Total number of entries
                uint16(files.length),

                // Central directory size
                uint32(centralDirectory.length),

                // Central directory offset
                uint32(centralOffset),

                // Comment length
                uint16(0)
            ]);


        return new Blob(
            [
                localData,
                centralDirectory,
                endRecord
            ],
            {
                type: "application/zip"
            }
        );
    }


    return {
        create
    };

})();

async function extractImagesFromZip(zipFile) {

    const data =
        new Uint8Array(
            await zipFile.arrayBuffer()
        );

    const view =
        new DataView(data.buffer);


    /* ======================================
       Find End Of Central Directory
    ====================================== */

    let eocdOffset = -1;

    for (
        let i = data.length - 22;
        i >= Math.max(0, data.length - 65557);
        i--
    ) {

        if (
            view.getUint32(i, true) ===
            0x06054B50
        ) {
            eocdOffset = i;
            break;
        }
    }


    if (eocdOffset === -1) {
        throw new Error(
            "Invalid ZIP file."
        );
    }


    const totalEntries =
        view.getUint16(
            eocdOffset + 10,
            true
        );

    const centralDirectoryOffset =
        view.getUint32(
            eocdOffset + 16,
            true
        );


    const decoder =
        new TextDecoder("utf-8");


    const images = [];


    /* ======================================
       Read Central Directory
    ====================================== */

    let offset =
        centralDirectoryOffset;


    for (
        let entryIndex = 0;
        entryIndex < totalEntries;
        entryIndex++
    ) {

        if (
            offset + 46 > data.length ||
            view.getUint32(offset, true) !==
            0x02014B50
        ) {
            break;
        }


        const flags =
            view.getUint16(
                offset + 8,
                true
            );

        const compression =
            view.getUint16(
                offset + 10,
                true
            );

        const compressedSize =
            view.getUint32(
                offset + 20,
                true
            );

        const fileNameLength =
            view.getUint16(
                offset + 28,
                true
            );

        const extraLength =
            view.getUint16(
                offset + 30,
                true
            );

        const commentLength =
            view.getUint16(
                offset + 32,
                true
            );

        const localHeaderOffset =
            view.getUint32(
                offset + 42,
                true
            );


        const nameStart =
            offset + 46;

        const nameEnd =
            nameStart + fileNameLength;


        const fileName =
            decoder.decode(
                data.slice(
                    nameStart,
                    nameEnd
                )
            );


        offset =
            nameEnd +
            extraLength +
            commentLength;


        /* ==============================
           Ignore folders
        ============================== */

        if (fileName.endsWith("/")) {
            continue;
        }


        const lowerName =
            fileName.toLowerCase();


        const isImage =
            lowerName.endsWith(".jpg") ||
            lowerName.endsWith(".jpeg") ||
            lowerName.endsWith(".png") ||
            lowerName.endsWith(".webp") ||
            lowerName.endsWith(".gif") ||
            lowerName.endsWith(".bmp") ||
            lowerName.endsWith(".avif") ||
            lowerName.endsWith(".tif") ||
            lowerName.endsWith(".tiff");


        if (!isImage) {
            continue;
        }


        /* ==================================
           Read Local File Header
        ================================== */

        if (
            localHeaderOffset + 30 >
            data.length
        ) {
            continue;
        }


        if (
            view.getUint32(
                localHeaderOffset,
                true
            ) !== 0x04034B50
        ) {
            continue;
        }


        const localFileNameLength =
            view.getUint16(
                localHeaderOffset + 26,
                true
            );

        const localExtraLength =
            view.getUint16(
                localHeaderOffset + 28,
                true
            );


        const dataStart =
            localHeaderOffset +
            30 +
            localFileNameLength +
            localExtraLength;


        const dataEnd =
            dataStart +
            compressedSize;


        if (
            dataStart < 0 ||
            dataEnd > data.length
        ) {
            continue;
        }


        let imageData;


        /* ==================================
           STORE - no compression
        ================================== */

        if (compression === 0) {

            imageData =
                data.slice(
                    dataStart,
                    dataEnd
                );

        }


        /* ==================================
           DEFLATE
        ================================== */

        else if (compression === 8) {

            if (
                typeof DecompressionStream ===
                "undefined"
            ) {
                throw new Error(
                    "This browser does not support ZIP decompression."
                );
            }


            const compressedData =
                data.slice(
                    dataStart,
                    dataEnd
                );


            const stream =
                new Blob([
                    compressedData
                ]).stream().pipeThrough(
                    new DecompressionStream(
                        "deflate-raw"
                    )
                );


            imageData =
                new Uint8Array(
                    await new Response(
                        stream
                    ).arrayBuffer()
                );

        }


        /* ==================================
           Unsupported compression
        ================================== */

        else {

            throw new Error(
                `Unsupported ZIP compression method for: ${fileName}`
            );

        }


        /* ==================================
           Create Image File
        ================================== */

        const mimeType =
            getImageMimeType(
                lowerName
            );


        const imageFile =
            new File(
                [imageData],
                fileName.split("/").pop(),
                {
                    type: mimeType
                }
            );


        images.push(
            imageFile
        );
    }


    /* ======================================
       Check Results
    ====================================== */

    if (!images.length) {

        throw new Error(
            "No supported images were found inside the ZIP."
        );
    }


    return images;
}

function getImageMimeType(fileName) {
    if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
        return "image/jpeg";
    }

    if (fileName.endsWith(".png")) {
        return "image/png";
    }

    if (fileName.endsWith(".webp")) {
        return "image/webp";
    }

    if (fileName.endsWith(".gif")) {
        return "image/gif";
    }

    if (fileName.endsWith(".bmp")) {
        return "image/bmp";
    }

    if (fileName.endsWith(".avif")) {
        return "image/avif";
    }

    if (fileName.endsWith(".tif") || fileName.endsWith(".tiff")) {
        return "image/tiff";
    }

    return "application/octet-stream";
}