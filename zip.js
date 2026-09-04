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